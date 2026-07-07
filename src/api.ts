import { HttpApi, OpenApi } from "effect/unstable/httpapi"
import { AuthApiGroup } from "./http/auth-api"
import { DepartmentsApiGroup, EmployeesApiGroup } from "./http/employees-api"

export class Api extends HttpApi.make("api")
  .add(AuthApiGroup)
  .add(DepartmentsApiGroup)
  .add(EmployeesApiGroup)
  .annotateMerge(OpenApi.annotations({ title: "hr-workplace API" })) {}
