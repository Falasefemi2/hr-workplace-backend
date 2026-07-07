import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PayGroupRepository } from "../repositories/pay-group-repository"

interface CreatePayGroupInput {
  name: string
  applyTaxSettings?: boolean
  applyPensionSettings?: boolean
  applyNhfSettings?: boolean
  applyNsitfSettings?: boolean
  applySalaryBreakdown?: boolean
  enableThirteenthMonthBonus?: boolean
  applyThirteenthMonthBonusPercentage?: boolean
  thirteenthMonthBonusPercentage?: string
}

export class PayGroupService extends Context.Service<PayGroupService>()(
  "api/domain/pay-group-service/PayGroupService",
  {
    make: Effect.gen(function* () {
      const repo = yield* PayGroupRepository

      const create = (organizationId: string, input: CreatePayGroupInput) => {
        const enableBonus = input.enableThirteenthMonthBonus ?? false
        const applyPercentage = enableBonus && (input.applyThirteenthMonthBonusPercentage ?? false)
        return repo
          .create({
            organizationId,
            name: input.name.trim(),
            applyTaxSettings: input.applyTaxSettings ?? true,
            applyPensionSettings: input.applyPensionSettings ?? true,
            applyNhfSettings: input.applyNhfSettings ?? true,
            applyNsitfSettings: input.applyNsitfSettings ?? true,
            applySalaryBreakdown: input.applySalaryBreakdown ?? true,
            enableThirteenthMonthBonus: enableBonus,
            applyThirteenthMonthBonusPercentage: applyPercentage,
            thirteenthMonthBonusPercentage: applyPercentage ? input.thirteenthMonthBonusPercentage : null,
          })
          .pipe(Effect.catchTag("DbError", Effect.orDie)) // <-- add
      }

      const list = (organizationId: string) =>
        repo.listByOrg(organizationId).pipe(Effect.catchTag("DbError", Effect.orDie)) // <-- add

      const getById = (organizationId: string, id: string) =>
        repo.findById(organizationId, id).pipe(Effect.catchTag("DbError", Effect.orDie)) // <-- new

      return { create, list, getById } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
