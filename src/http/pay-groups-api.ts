import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { ForbiddenError, PayGroupNameTakenError, PayGroupNotFoundError } from "../errors"
import { Authorization } from "./auth-middleware"

const PayGroupSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  applyTaxSettings: Schema.Boolean,
  applyPensionSettings: Schema.Boolean,
  applyNhfSettings: Schema.Boolean,
  applyNsitfSettings: Schema.Boolean,
  applySalaryBreakdown: Schema.Boolean,
  enableThirteenthMonthBonus: Schema.Boolean,
  applyThirteenthMonthBonusPercentage: Schema.Boolean,
  thirteenthMonthBonusPercentage: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
})

const CreatePayGroupPayload = Schema.Struct({
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
  applyTaxSettings: Schema.optional(Schema.Boolean),
  applyPensionSettings: Schema.optional(Schema.Boolean),
  applyNhfSettings: Schema.optional(Schema.Boolean),
  applyNsitfSettings: Schema.optional(Schema.Boolean),
  applySalaryBreakdown: Schema.optional(Schema.Boolean),
  enableThirteenthMonthBonus: Schema.optional(Schema.Boolean),
  applyThirteenthMonthBonusPercentage: Schema.optional(Schema.Boolean),
  thirteenthMonthBonusPercentage: Schema.optional(
    Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{1,2}(\.\d{1,2})?$/))),
  ),
})

const PayGroupIdParams = Schema.Struct({
  id: Schema.String,
})

export class PayGroupsApiGroup extends HttpApiGroup.make("payGroups")
  .add(
    HttpApiEndpoint.get("list", "/pay-groups", {
      success: Schema.Array(PayGroupSchema),
      error: [ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.get("get", "/pay-groups/:id", {
      params: PayGroupIdParams,
      success: PayGroupSchema,
      error: [PayGroupNotFoundError, ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.post("create", "/pay-groups", {
      payload: CreatePayGroupPayload,
      success: PayGroupSchema,
      error: [PayGroupNameTakenError, ForbiddenError],
    }),
  )
  .middleware(Authorization) {}
