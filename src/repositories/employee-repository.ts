import { and, count, desc, eq, ilike, or } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgDatabase } from "../db"
import { departments, employeeInvitationTokens, employees, type NewEmployee } from "../db/schema"
import { DbError } from "../errors"

const toDbError = (cause: unknown) => new DbError({ cause })

export class EmployeeRepository extends Context.Service<EmployeeRepository>()("hr-workplace/EmployeeRepository", {
  make: Effect.gen(function* () {
    const db = yield* PgDatabase

    const createMany = (rows: NewEmployee[]) =>
      rows.length === 0
        ? Effect.succeed([])
        : db.insert(employees).values(rows).returning().pipe(Effect.mapError(toDbError))

    const findExistingEmails = (organizationId: string, emails: string[]) =>
      emails.length === 0
        ? Effect.succeed(new Set<string>())
        : db
            .select({ email: employees.email })
            .from(employees)
            .where(eq(employees.organizationId, organizationId))
            .pipe(
              Effect.map((rows) => new Set(rows.map((r) => r.email.toLowerCase()))),
              Effect.mapError(toDbError),
            )

    const departmentExists = (organizationId: string, departmentId: string) =>
      db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.id, departmentId), eq(departments.organizationId, organizationId)))
        .pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.mapError(toDbError),
        )

    const storeInvitationToken = (params: { employeeId: string; tokenHash: string; expiresAt: Date }) =>
      db.insert(employeeInvitationTokens).values(params).pipe(Effect.asVoid, Effect.mapError(toDbError))

    const listByOrg = (
      organizationId: string,
      params: {
        status?: "invited" | "active" | "deactivated"
        search?: string
        departmentId?: string
        page: number
        limit: number
      },
    ) => {
      const conditions = [eq(employees.organizationId, organizationId)]
      if (params.status) conditions.push(eq(employees.status, params.status))
      if (params.departmentId) conditions.push(eq(employees.departmentId, params.departmentId))
      if (params.search) {
        conditions.push(
          or(
            ilike(employees.firstName, `%${params.search}%`),
            ilike(employees.lastName, `%${params.search}%`),
            ilike(employees.email, `%${params.search}%`),
          )!,
        )
      }
      const where = and(...conditions)

      const dataQuery = db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          phoneNumber: employees.phoneNumber,
          monthlyGross: employees.monthlyGross,
          status: employees.status,
          departmentId: employees.departmentId,
          departmentName: departments.name,
          createdAt: employees.createdAt,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(where)
        .orderBy(desc(employees.createdAt))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit)

      const countQuery = db.select({ value: count() }).from(employees).where(where)

      return Effect.all([dataQuery, countQuery]).pipe(
        Effect.map(([data, countRows]) => ({ data, total: countRows[0]?.value ?? 0 })),
        Effect.mapError(toDbError),
      )
    }

    return { createMany, findExistingEmails, departmentExists, storeInvitationToken, listByOrg } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
