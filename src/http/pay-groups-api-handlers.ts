import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpApiBuilder, HttpApiGroup } from "effect/unstable/httpapi"
import { Api } from "../api"
import { PgDatabaseLive } from "../db"
import type { PayGroup } from "../db/schema"
import { PayGroupService } from "../domain/pay-group-service"
import { PayGroupRepository } from "../repositories/pay-group-repository"
import { CacheLive } from "../services/cache-service"
import { TokenService } from "../services/token-service"
import { AuthorizationLayer, CurrentUser, requireRole } from "./auth-middleware"

const toPayGroupDTO = (row: PayGroup) => ({
  id: row.id,
  name: row.name,
  applyTaxSettings: row.applyTaxSettings,
  applyPensionSettings: row.applyPensionSettings,
  applyNhfSettings: row.applyNhfSettings,
  applyNsitfSettings: row.applyNsitfSettings,
  applySalaryBreakdown: row.applySalaryBreakdown,
  enableThirteenthMonthBonus: row.enableThirteenthMonthBonus,
  applyThirteenthMonthBonusPercentage: row.applyThirteenthMonthBonusPercentage,
  thirteenthMonthBonusPercentage: row.thirteenthMonthBonusPercentage,
  createdAt: row.createdAt.toISOString(),
})

export const PayGroupsApiHandlers = HttpApiBuilder.group(Api, "payGroups", (handlers) =>
  Effect.gen(function* () {
    const payGroups = yield* PayGroupService
    return handlers
      .handle("list", () =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const rows = yield* payGroups.list(user.organizationId)
          return rows.map(toPayGroupDTO)
        }),
      )
      .handle("get", ({ params }) =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const row = yield* payGroups.getById(user.organizationId, params.id)
          return toPayGroupDTO(row)
        }),
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          const row = yield* payGroups.create(user.organizationId, payload)
          return toPayGroupDTO(row)
        }),
      )
  }),
).pipe(
  Layer.provide(PayGroupService.layer),
  Layer.provide(PayGroupRepository.layer),
  Layer.provide(AuthorizationLayer),
  Layer.provide(TokenService.layer),
  Layer.provide(CacheLive),
  Layer.provide(PgDatabaseLive),
)
