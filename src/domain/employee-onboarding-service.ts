import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { DepartmentRepository } from "../repositories/department-repository"
import { EmployeeRepository } from "../repositories/employee-repository"
import { AppLogger } from "../services/app-logger"
import { EmailService } from "../services/email-service"
import { TokenService } from "../services/token-service"

export interface OnboardingRow {
  firstName: string
  lastName: string
  email: string
  gender?: "male" | "female" | "other" | "prefer_not_to_say"
  country?: string
  phoneNumber?: string
  departmentName?: string
  monthlyGross?: string
}

export interface RowResult {
  index: number
  status: "created" | "error"
  error?: string
}

const EMAIL_RE = /^\S+@\S+\.\S+$/
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days — HR-initiated invite, longer window than self-serve email verification

const validateRow = (row: OnboardingRow): string | null => {
  if (!row.firstName?.trim()) return "First name is required"
  if (!row.lastName?.trim()) return "Last name is required"
  if (!row.email || !EMAIL_RE.test(row.email)) return "Invalid email"
  if (row.monthlyGross !== undefined && isNaN(Number(row.monthlyGross))) return "Invalid monthly gross"
  return null
}

const normalizeRow = (row: OnboardingRow): OnboardingRow => ({
  firstName: row.firstName?.trim() ?? "",
  lastName: row.lastName?.trim() ?? "",
  email: row.email?.trim() ?? "",
  gender: row.gender || undefined,
  country: row.country?.trim() || undefined,
  phoneNumber: row.phoneNumber?.trim() || undefined,
  departmentName: row.departmentName?.trim() || undefined,
  monthlyGross: row.monthlyGross?.trim() || undefined,
})

export class EmployeeOnboardingService extends Context.Service<EmployeeOnboardingService>()(
  "hr-workplace/EmployeeOnboardingService",
  {
    make: Effect.gen(function* () {
      const employeeRepo = yield* EmployeeRepository
      const departmentRepo = yield* DepartmentRepository
      const tokens = yield* TokenService
      const email = yield* EmailService
      const logger = yield* AppLogger

      const bulkOnboard = (organizationId: string, rows: readonly OnboardingRow[]) =>
        Effect.gen(function* () {
          const normalized = rows.map(normalizeRow)

          const existingEmails = yield* employeeRepo.findExistingEmails(
            organizationId,
            normalized.map((r) => r.email).filter(Boolean),
          )

          // Resolve department names → ids once, in memory — avoids N queries for N rows.
          const departments = yield* departmentRepo.listByOrg(organizationId)
          const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]))

          const results: RowResult[] = []
          const validRows: Array<{ index: number; row: OnboardingRow; departmentId: string | null }> = []
          const seenInBatch = new Set<string>()

          normalized.forEach((row, index) => {
            const validationError = validateRow(row)
            const normalizedEmail = row.email?.toLowerCase()

            if (validationError) {
              results.push({ index, status: "error", error: validationError })
              return
            }
            if (existingEmails.has(normalizedEmail)) {
              results.push({ index, status: "error", error: "Employee with this email already exists" })
              return
            }
            if (seenInBatch.has(normalizedEmail)) {
              results.push({ index, status: "error", error: "Duplicate email within this upload" })
              return
            }

            let departmentId: string | null = null
            if (row.departmentName) {
              const resolved = deptByName.get(row.departmentName.toLowerCase())
              if (!resolved) {
                results.push({ index, status: "error", error: `Unknown department: ${row.departmentName}` })
                return
              }
              departmentId = resolved
            }

            seenInBatch.add(normalizedEmail)
            validRows.push({ index, row, departmentId })
          })

          if (validRows.length === 0) {
            return { created: 0, results: results.sort((a, b) => a.index - b.index) }
          }

          const created = yield* employeeRepo.createMany(
            validRows.map(({ row, departmentId }) => ({
              organizationId,
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email.toLowerCase(),
              gender: row.gender,
              country: row.country,
              phoneNumber: row.phoneNumber,
              departmentId,
              monthlyGross: row.monthlyGross,
              status: "invited" as const,
            })),
          )

          // Invitation dispatch — best-effort, concurrency-capped. A dropped
          // email must not roll back employee creation; failures are logged,
          // not thrown, and are recoverable via a future "resend invite" action.
          yield* Effect.forEach(
            created,
            (emp) =>
              Effect.gen(function* () {
                const { token, tokenHash } = yield* tokens.generateRefreshToken()
                yield* employeeRepo.storeInvitationToken({
                  employeeId: emp.id,
                  tokenHash,
                  expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
                })
                yield* email
                  .sendEmployeeInvitationEmail({
                    to: emp.email,
                    fullName: `${emp.firstName} ${emp.lastName}`,
                    token,
                  })
                  .pipe(
                    Effect.catchTag("EmailError", (e) =>
                      logger.error("Failed to send onboarding invitation", {
                        employeeId: emp.id,
                        error: e.message,
                      }),
                    ),
                  )
              }),
            { concurrency: 5 },
          )

          validRows.forEach((v) => results.push({ index: v.index, status: "created" }))

          yield* logger.info("Bulk employee onboarding completed", {
            organizationId,
            createdCount: created.length,
            errorCount: results.filter((r) => r.status === "error").length,
          })

          return { created: created.length, results: results.sort((a, b) => a.index - b.index) }
        }).pipe(Effect.catchTag("DbError", Effect.orDie)) // <-- add this at the end

      return { bulkOnboard } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
