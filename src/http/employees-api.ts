import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { DepartmentNameTakenError, DepartmentNotFoundError, ForbiddenError } from "../errors"
import { Authorization } from "./auth-middleware"

const DepartmentSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  leadEmployeeId: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
})

const OnboardingRowSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  email: Schema.String,
  gender: Schema.optional(Schema.Literals(["male", "female", "other", "prefer_not_to_say"])),
  country: Schema.optional(Schema.String.pipe(Schema.check(Schema.isLengthBetween(2, 2)))),
  phoneNumber: Schema.optional(Schema.String),
  departmentName: Schema.optional(Schema.String),
  monthlyGross: Schema.optional(Schema.String),
})

const EmployeeSchema = Schema.Struct({
  id: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  email: Schema.String,
  phoneNumber: Schema.NullOr(Schema.String),
  monthlyGross: Schema.NullOr(Schema.String),
  status: Schema.Literals(["invited", "active", "deactivated"]),
  departmentId: Schema.NullOr(Schema.String),
  departmentName: Schema.NullOr(Schema.String),
})

const PaginatedEmployeesSchema = Schema.Struct({
  data: Schema.Array(EmployeeSchema),
  total: Schema.Number,
  page: Schema.Number,
  limit: Schema.Number,
  totalPages: Schema.Number,
})

const RowResultSchema = Schema.Struct({
  index: Schema.Number,
  status: Schema.Literals(["created", "error"]),
  error: Schema.optional(Schema.String),
})

export class DepartmentsApiGroup extends HttpApiGroup.make("departments")
  .add(
    HttpApiEndpoint.get("list", "/departments", {
      success: Schema.Array(DepartmentSchema),
      error: [ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.post("create", "/departments", {
      payload: Schema.Struct({
        name: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
        leadEmployeeId: Schema.optional(Schema.String),
      }),
      success: DepartmentSchema,
      error: [DepartmentNameTakenError, ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.patch("setLead", "/departments/:id/lead", {
      params: Schema.Struct({ id: Schema.String }),
      payload: Schema.Struct({ leadEmployeeId: Schema.NullOr(Schema.String) }),
      success: Schema.Void,
      error: [DepartmentNotFoundError, ForbiddenError],
    }),
  )
  .middleware(Authorization) {}

export class EmployeesApiGroup extends HttpApiGroup.make("employees")
  .add(
    HttpApiEndpoint.post("bulkOnboard", "/employees/onboarding", {
      payload: Schema.Struct({ rows: Schema.Array(OnboardingRowSchema) }),
      success: Schema.Struct({
        created: Schema.Number,
        results: Schema.Array(RowResultSchema),
      }),
      error: [ForbiddenError],
    }),
  )
  .add(
    HttpApiEndpoint.get("list", "/employees", {
      params: Schema.Struct({
        status: Schema.optional(Schema.Literals(["invited", "active", "deactivated"])),
        search: Schema.optional(Schema.String),
        departmentId: Schema.optional(Schema.String),
        page: Schema.optional(Schema.String),
        limit: Schema.optional(Schema.String),
      }),
      success: PaginatedEmployeesSchema,
      error: [ForbiddenError],
    }),
  )
  .middleware(Authorization) {}
