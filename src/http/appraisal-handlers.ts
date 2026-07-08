import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { PgDatabaseLive } from "../db"
import type { Appraisal } from "../db/schema"
import { AppraisalService } from "../domain/appraisal-service"
import { AppraisalRepository } from "../repositories/appraisal-repository"
import { EmployeeRepository } from "../repositories/employee-repository"
import { CacheLive } from "../services/cache-service"
import { TokenService } from "../services/token-service"
import { AuthorizationLayer, CurrentUser, requireRole } from "./auth-middleware"

const toAppraisalDTO = (row: Appraisal) => ({
  id: row.id,
  period: row.period,
  reviewerType: row.reviewerType,
  reviewerEmployeeId: row.reviewerEmployeeId,
  reviewerName: row.reviewerName,
  reviewerEmail: row.reviewerEmail,
  startDate: row.startDate,
  dueDate: row.dueDate,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
})

export const AppraisalsApiHandlers = HttpApiBuilder.group(Api, "appraisals", (handlers) =>
  Effect.gen(function* () {
    const appraisals = yield* AppraisalService
    return handlers
      .handle("list", ({ params }) =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const rows = yield* appraisals.list(user.organizationId, { status: params.status })
          return rows.map(({ appraisal, employeeIds }) => ({
            ...toAppraisalDTO(appraisal),
            employeeIds,
          }))
        }),
      )
      .handle("detail", ({ params }) =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const detail = yield* appraisals.getDetail(user.organizationId, params.id)
          return {
            ...toAppraisalDTO(detail.appraisal),
            employeeIds: detail.employeeIds,
          }
        }),
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          const row = yield* appraisals.create(user.organizationId, user.userId, payload)
          return toAppraisalDTO(row)
        }),
      )
      .handle("updateStatus", ({ params, payload }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          yield* appraisals.updateStatus(user.organizationId, params.id, payload.status)
        }),
      )
  }),
).pipe(
  Layer.provide(AppraisalService.layer),
  Layer.provide(AppraisalRepository.layer),
  Layer.provide(EmployeeRepository.layer),
  Layer.provide(AuthorizationLayer),
  Layer.provide(TokenService.layer),
  Layer.provide(CacheLive),
  Layer.provide(PgDatabaseLive),
)
