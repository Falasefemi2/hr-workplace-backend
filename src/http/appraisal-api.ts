import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { AppraisalNotFoundError, ForbiddenError, InvalidReviewerError } from "../errors"
import { Authorization } from "./auth-middleware"

const AppraisalSchema = Schema.Struct({
  id: Schema.String,
  period: Schema.Literals(["quarterly", "half_yearly", "annually"]),
  reviewerType: Schema.Literals(["department_lead", "email_invite"]),
  reviewerEmployeeId: Schema.NullOr(Schema.String),
  reviewerName: Schema.String,
  reviewerEmail: Schema.NullOr(Schema.String),
  startDate: Schema.String,
  dueDate: Schema.String,
  status: Schema.Literals(["not_started", "in_progress", "completed"]),
  createdAt: Schema.String,
})

const AppraisalWithEmployeesSchema = Schema.Struct({
  ...AppraisalSchema.fields,
  employeeIds: Schema.Array(Schema.String),
})

const CreateAppraisalPayload = Schema.Struct({
  period: Schema.Literals(["quarterly", "half_yearly", "annually"]),
  employeeIds: Schema.Array(Schema.String).pipe(Schema.check(Schema.isMinLength(1))),
  reviewerType: Schema.Literals(["department_lead", "email_invite"]),
  reviewerEmployeeId: Schema.optional(Schema.String),
  reviewerName: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
  reviewerEmail: Schema.optional(Schema.String),
  startDate: Schema.String,
  dueDate: Schema.String,
})

const AppraisalIdParams = Schema.Struct({ id: Schema.String })

export class AppraisalsApiGroup extends HttpApiGroup.make("appraisals")
  .add(
    HttpApiEndpoint.get("list", "/appraisals", {
      params: Schema.Struct({
        status: Schema.optional(Schema.Literals(["not_started", "in_progress", "completed"])),
      }),
      success: Schema.Array(AppraisalWithEmployeesSchema),
      error: [ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.get("detail", "/appraisals/:id", {
      params: AppraisalIdParams,
      success: AppraisalWithEmployeesSchema,
      error: [AppraisalNotFoundError, ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.post("create", "/appraisals", {
      payload: CreateAppraisalPayload,
      success: AppraisalSchema,
      error: [InvalidReviewerError, ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.patch("updateStatus", "/appraisals/:id/status", {
      params: AppraisalIdParams,
      payload: Schema.Struct({
        status: Schema.Literals(["not_started", "in_progress", "completed"]),
      }),
      success: Schema.Void,
      error: [AppraisalNotFoundError, ForbiddenError],
    }),
  )
  .middleware(Authorization) {}
