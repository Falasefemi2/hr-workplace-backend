import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import * as Layer from "effect/Layer"
import { HttpMiddleware, HttpRouter } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi"
import { Api } from "./src/api"
import { PgDatabaseLive } from "./src/db"
import { AuthApiHandlers } from "./src/http/auth-api-handlers"
import { OrganizationRepository } from "./src/repositories/organization-repository"
import { UserRepository } from "./src/repositories/user-repository"
import { AppLogger } from "./src/services/app-logger"
import { EmailService } from "./src/services/email-service"
import { LoggerLayer } from "./src/services/logging-service"
import { PasswordService } from "./src/services/password-service"
import { RateLimiterLive } from "./src/services/ratelimit-service"
import { SecretsService } from "./src/services/secrets-service"
import { TokenService } from "./src/services/token-service"

const InfraLive = Layer.mergeAll(PgDatabaseLive, SecretsService.layer, AppLogger.layer)

const ServicesLive = Layer.mergeAll(TokenService.layer, EmailService.layer, PasswordService.layer).pipe(
  Layer.provide(InfraLive),
)

const RepositoriesLive = Layer.mergeAll(UserRepository.layer, OrganizationRepository.layer).pipe(
  Layer.provide(InfraLive),
)

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(Layer.provide(AuthApiHandlers))

const DocsRoute = HttpApiScalar.layer(Api, { path: "/docs" })

const AllRoutes = Layer.mergeAll(ApiRoutes, DocsRoute)

const HttpServerLayer = HttpRouter.serve(AllRoutes, {
  middleware: (app) =>
    app.pipe(
      HttpMiddleware.cors({
        allowedOrigins: ["http://localhost:3001"],
        allowedMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
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

BunRuntime.runMain(Layer.launch(AppLayer))
