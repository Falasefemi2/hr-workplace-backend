import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import * as Layer from "effect/Layer"
import { HttpMiddleware, HttpRouter } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi"
import { Api } from "./src/api"
import { PgDatabaseLive } from "./src/db"
import { DepartmentService } from "./src/domain/department-service"
import { EmployeeService } from "./src/domain/employee-service"
import { PayGroupService } from "./src/domain/pay-group-service"
import { AuthApiHandlers } from "./src/http/auth-api-handlers"
import { AuthorizationLayer } from "./src/http/auth-middleware"
import { DepartmentsApiHandlers, EmployeesApiHandlers } from "./src/http/employees-api-handlers"
import { onboardingTemplateRoute } from "./src/http/onboarding-template-route"
import { PayGroupsApiHandlers } from "./src/http/pay-groups-api-handlers"
import { DepartmentRepository } from "./src/repositories/department-repository"
import { EmployeeRepository } from "./src/repositories/employee-repository"
import { OrganizationRepository } from "./src/repositories/organization-repository"
import { PayGroupRepository } from "./src/repositories/pay-group-repository"
import { UserRepository } from "./src/repositories/user-repository"
import { AppLogger } from "./src/services/app-logger"
import { EmailService } from "./src/services/email-service"
import { LoggerLayer } from "./src/services/logging-service"
import { PasswordService } from "./src/services/password-service"
import { RateLimiterLive } from "./src/services/ratelimit-service"
import { SecretsService } from "./src/services/secrets-service"
import { TokenService } from "./src/services/token-service"

const InfraLive = Layer.mergeAll(PgDatabaseLive, SecretsService.layer, AppLogger.layer)

const ServicesLive = Layer.mergeAll(
  TokenService.layer,
  EmailService.layer,
  PasswordService.layer,
  EmployeeService.layer,
  DepartmentService.layer,
  PayGroupService.layer,
).pipe(Layer.provide(InfraLive))

const RepositoriesLive = Layer.mergeAll(
  UserRepository.layer,
  OrganizationRepository.layer,
  DepartmentRepository.layer,
  EmployeeRepository.layer,
  PayGroupRepository.layer,
).pipe(Layer.provide(InfraLive))

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide(AuthApiHandlers),
  Layer.provide(DepartmentsApiHandlers),
  Layer.provide(EmployeesApiHandlers),
  Layer.provide(PayGroupsApiHandlers),
  Layer.provide(AuthorizationLayer),
)

const DocsRoute = HttpApiScalar.layer(Api, { path: "/docs" })

const OnboardingLayer = HttpRouter.addAll([onboardingTemplateRoute])

const AllRoutes = Layer.mergeAll(ApiRoutes as any, DocsRoute as any, OnboardingLayer as any) as unknown as Layer.Layer<
  never,
  never,
  any
>

const HttpServerLayer = HttpRouter.serve(AllRoutes, {
  middleware: (app) =>
    app.pipe(
      HttpMiddleware.cors({
        allowedOrigins: ["http://localhost:3001"],
        allowedMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "traceparent",
          "tracestate",
          "b3",
          "x-b3-traceid",
          "x-b3-spanid",
          "x-b3-sampled",
          "baggage",
        ],
        credentials: true,
      }),
    ),
}).pipe(Layer.provide(BunHttpServer.layer({ port: 3000 })))

const AppLayer = HttpServerLayer.pipe(
  Layer.provide(ServicesLive),
  Layer.provide(RepositoriesLive),
  Layer.provide(InfraLive),
  Layer.provide(RateLimiterLive),
  Layer.provide(LoggerLayer),
)

BunRuntime.runMain(Layer.launch(AppLayer) as any)
