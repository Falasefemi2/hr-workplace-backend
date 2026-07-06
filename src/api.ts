import { HttpApi, OpenApi } from "effect/unstable/httpapi"
import { AuthApiGroup } from "./http/auth-api"

export class Api extends HttpApi.make("api")
  .add(AuthApiGroup)
  .annotateMerge(OpenApi.annotations({ title: "hr-workplace API" })) {}
