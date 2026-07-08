import { HttpApi, OpenApi } from "effect/unstable/httpapi"
import { AppraisalsApiGroup } from "./http/appraisal-api"
import { AuthApiGroup } from "./http/auth-api"
import { DepartmentsApiGroup, EmployeesApiGroup } from "./http/employees-api"
import { OkrsApiGroup } from "./http/okrs-api"
import { PayGroupsApiGroup } from "./http/pay-groups-api"

export class Api extends HttpApi.make("api")
  .add(AuthApiGroup)
  .add(DepartmentsApiGroup)
  .add(EmployeesApiGroup)
  .add(PayGroupsApiGroup)
  .add(OkrsApiGroup)
  .add(AppraisalsApiGroup)
  .annotateMerge(OpenApi.annotations({ title: "hr-workplace API" })) {}
