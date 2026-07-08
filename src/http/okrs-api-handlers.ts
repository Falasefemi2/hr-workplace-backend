import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { PgDatabaseLive } from "../db"
import type { KeyResult, Objective } from "../db/schema"
import { OkrsService } from "../domain/okrs-service"
import { ObjectiveRepository } from "../repositories/objective-repository"
import { CacheLive } from "../services/cache-service"
import { TokenService } from "../services/token-service"
import { AuthorizationLayer, CurrentUser, requireRole } from "./auth-middleware"

const toObjectiveDTO = (row: Objective) => ({
  id: row.id,
  workflow: row.workflow,
  title: row.title,
  description: row.description,
  periodYear: row.periodYear,
  periodQuarter: row.periodQuarter,
  deadline: row.deadline,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
})

const toKeyResultDTO = (row: KeyResult) => ({
  id: row.id,
  title: row.title,
  targetType: row.targetType,
  targetValue: row.targetValue,
  currentValue: row.currentValue,
  unit: row.unit,
  departmentId: row.departmentId,
  assignedEmployeeId: row.assignedEmployeeId,
})

export const OkrsApiHandlers = HttpApiBuilder.group(Api, "okrs", (handlers) =>
  Effect.gen(function* () {
    const okrs = yield* OkrsService

    return handlers
      .handle("list", ({ params }) =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const year = params.year ? Number(params.year) : undefined
          const quarter = params.quarter ? Number(params.quarter) : undefined
          const rows = yield* okrs.list(user.organizationId, { year, quarter })
          return rows.map(toObjectiveDTO)
        }),
      )
      .handle("detail", ({ params }) =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const detail = yield* okrs.getDetail(user.organizationId, params.id)
          return {
            objective: toObjectiveDTO(detail.objective),
            departmentIds: detail.departmentIds,
            keyResults: detail.keyResults.map(toKeyResultDTO),
          }
        }),
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          const row = yield* okrs.createObjective(user.organizationId, user.userId, payload)
          return toObjectiveDTO(row)
        }),
      )
      .handle("publish", ({ params }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          yield* okrs.publish(user.organizationId, params.id)
        }),
      )
      .handle("addKeyResult", ({ params, payload }) =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const row = yield* okrs.addKeyResultAsHod(
            user.organizationId,
            user.userId,
            params.id,
            payload.departmentId,
            payload.keyResult,
          )
          if (!row) {
            throw new Error("Failed to add key result")
          }
          return toKeyResultDTO(row)
        }),
      )
  }),
).pipe(
  Layer.provide(OkrsService.layer),
  Layer.provide(ObjectiveRepository.layer),
  Layer.provide(AuthorizationLayer),
  Layer.provide(TokenService.layer),
  Layer.provide(CacheLive),
  Layer.provide(PgDatabaseLive),
)
