import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Appraisal } from "../db/schema"
import { InvalidReviewerError } from "../errors"
import { type AppraisalListFilters, AppraisalRepository } from "../repositories/appraisal-repository"
import { EmployeeRepository } from "../repositories/employee-repository"

interface CreateAppraisalInput {
  period: "quarterly" | "half_yearly" | "annually"
  employeeIds: readonly string[]
  reviewerType: "department_lead" | "email_invite"
  reviewerEmployeeId?: string
  reviewerName: string
  reviewerEmail?: string
  startDate: string
  dueDate: string
}

export interface AppraisalDetail {
  appraisal: Appraisal
  employeeIds: readonly string[]
}

export class AppraisalService extends Context.Service<AppraisalService>()("hr-workplace/AppraisalService", {
  make: Effect.gen(function* () {
    const appraisalRepo = yield* AppraisalRepository
    const employeeRepo = yield* EmployeeRepository

    const list = (organizationId: string, filters: AppraisalListFilters) =>
      Effect.gen(function* () {
        const rows = yield* appraisalRepo.listByOrg(organizationId, filters)
        const employeeLinks = yield* appraisalRepo.findEmployeeIdsForAppraisals(rows.map((r) => r.id))
        const employeesByAppraisal = new Map<string, string[]>()
        employeeLinks.forEach((link) => {
          const list = employeesByAppraisal.get(link.appraisalId) ?? []
          list.push(link.employeeId)
          employeesByAppraisal.set(link.appraisalId, list)
        })
        return rows.map((row) => ({
          appraisal: row,
          employeeIds: employeesByAppraisal.get(row.id) ?? [],
        }))
      }).pipe(Effect.catchTag("DbError", Effect.orDie))

    const getDetail = (organizationId: string, appraisalId: string): Effect.Effect<AppraisalDetail, any> =>
      Effect.gen(function* () {
        const appraisal = yield* appraisalRepo.findById(organizationId, appraisalId)
        const employeeIds = yield* appraisalRepo.findEmployeeIdsForAppraisal(appraisalId)
        return { appraisal, employeeIds }
      }).pipe(Effect.catchTag("DbError", Effect.orDie))
    // ^ AppraisalNotFoundError deliberately left uncaught — it's the real 404

    const create = (organizationId: string, userId: string, input: CreateAppraisalInput) =>
      Effect.gen(function* () {
        if (input.employeeIds.length === 0) {
          return yield* Effect.fail(new InvalidReviewerError({ reason: "At least one employee must be selected" }))
        }

        if (input.reviewerType === "department_lead" && !input.reviewerEmployeeId) {
          return yield* Effect.fail(
            new InvalidReviewerError({ reason: "reviewerEmployeeId is required when reviewerType is department_lead" }),
          )
        }
        if (input.reviewerType === "email_invite" && !input.reviewerEmail) {
          return yield* Effect.fail(
            new InvalidReviewerError({ reason: "reviewerEmail is required when reviewerType is email_invite" }),
          )
        }

        // If department_lead was chosen, verify the picked employee is actually a lead of some department.
        if (input.reviewerType === "department_lead" && input.reviewerEmployeeId) {
          const exists = yield* employeeRepo
            .employeeExists(organizationId, input.reviewerEmployeeId)
            .pipe(Effect.catchTag("DbError", Effect.orDie))
          if (!exists) {
            return yield* Effect.fail(new InvalidReviewerError({ reason: "Selected reviewer employee not found" }))
          }
        }

        const created = yield* appraisalRepo
          .create(
            {
              organizationId,
              period: input.period,
              reviewerType: input.reviewerType,
              reviewerEmployeeId: input.reviewerType === "department_lead" ? (input.reviewerEmployeeId ?? null) : null,
              reviewerName: input.reviewerName.trim(),
              reviewerEmail: input.reviewerType === "email_invite" ? (input.reviewerEmail ?? null) : null,
              startDate: input.startDate,
              dueDate: input.dueDate,
              status: "not_started",
              createdByUserId: userId,
            },
            input.employeeIds,
          )
          .pipe(Effect.catchTag("DbError", Effect.orDie))

        return created
      })

    const updateStatus = (
      organizationId: string,
      appraisalId: string,
      status: "not_started" | "in_progress" | "completed",
    ) =>
      Effect.gen(function* () {
        yield* appraisalRepo.findById(organizationId, appraisalId) // 404s if missing/wrong org
        yield* appraisalRepo.updateStatus(organizationId, appraisalId, status)
      }).pipe(Effect.catchTag("DbError", Effect.orDie))

    return { list, getDetail, create, updateStatus } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
