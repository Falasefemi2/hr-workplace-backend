import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import {
  ForbiddenError,
  InvalidWorkflowOperationError,
  NotDepartmentLeadError,
  ObjectiveAlreadyPublishedError,
  ObjectiveNotFoundError,
} from "../errors"
import { Authorization } from "../http/auth-middleware"

const KeyResultInputSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
  targetType: Schema.Literals(["number", "percentage", "currency"]),
  targetValue: Schema.String.pipe(Schema.check(Schema.isPattern(/^\d+(\.\d{1,2})?$/))),
  unit: Schema.optional(Schema.String),
  assignedEmployeeId: Schema.optional(Schema.String),
})

const KeyResultSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  targetType: Schema.Literals(["number", "percentage", "currency"]),
  targetValue: Schema.String,
  currentValue: Schema.String,
  unit: Schema.NullOr(Schema.String),
  departmentId: Schema.NullOr(Schema.String),
  assignedEmployeeId: Schema.NullOr(Schema.String),
})

const ObjectiveSchema = Schema.Struct({
  id: Schema.String,
  workflow: Schema.Literals(["simplified", "flat"]),
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  periodYear: Schema.Number,
  periodQuarter: Schema.NullOr(Schema.Number),
  deadline: Schema.NullOr(Schema.String),
  status: Schema.Literals(["draft", "published", "archived"]),
  createdAt: Schema.String,
})

const ObjectiveDetailSchema = Schema.Struct({
  objective: ObjectiveSchema,
  departmentIds: Schema.Array(Schema.String),
  keyResults: Schema.Array(KeyResultSchema),
})

export class OkrsApiGroup extends HttpApiGroup.make("okrs")
  .add(
    HttpApiEndpoint.get("list", "/okrs/objectives", {
      params: Schema.Struct({
        year: Schema.optional(Schema.String),
        quarter: Schema.optional(Schema.String),
      }),
      success: Schema.Array(ObjectiveSchema),
      error: [ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.get("detail", "/okrs/objectives/:id", {
      params: Schema.Struct({ id: Schema.String }),
      success: ObjectiveDetailSchema,
      error: [ObjectiveNotFoundError, ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.post("create", "/okrs/objectives", {
      payload: Schema.Struct({
        workflow: Schema.Literals(["simplified", "flat"]),
        title: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
        description: Schema.optional(Schema.String),
        periodYear: Schema.Number,
        periodQuarter: Schema.optional(Schema.Number),
        deadline: Schema.optional(Schema.String),
        departmentIds: Schema.Array(Schema.String),
        keyResults: Schema.optional(Schema.Array(KeyResultInputSchema)),
        publish: Schema.Boolean,
      }),
      success: ObjectiveSchema,
      error: [InvalidWorkflowOperationError, ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.post("publish", "/okrs/objectives/:id/publish", {
      params: Schema.Struct({ id: Schema.String }),
      success: Schema.Void,
      error: [ObjectiveNotFoundError, ObjectiveAlreadyPublishedError, ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.post("addKeyResult", "/okrs/objectives/:id/key-results", {
      params: Schema.Struct({ id: Schema.String }),
      payload: Schema.Struct({
        departmentId: Schema.String,
        keyResult: KeyResultInputSchema,
      }),
      success: KeyResultSchema,
      error: [ObjectiveNotFoundError, NotDepartmentLeadError, InvalidWorkflowOperationError],
    }),
  )
  .middleware(Authorization) {}
