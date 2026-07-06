import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { PgDatabaseLive } from "../db"
import { AuthService } from "../domain/auth-service"
import { OrganizationRepository } from "../repositories/organization-repository"
import { UserRepository } from "../repositories/user-repository"
import { AppLogger } from "../services/app-logger"
import { EmailService } from "../services/email-service"
import { PasswordService } from "../services/password-service"
import { clientKey, RateLimiterLive, RateLimiterService } from "../services/ratelimit-service"
import { SecretsService } from "../services/secrets-service"
import { TokenService } from "../services/token-service"

export const AuthApiHandlers = HttpApiBuilder.group(
  Api,
  "auth",
  Effect.fn(function* (handlers) {
    const auth = yield* AuthService
    const rateLimiter = yield* RateLimiterService

    return handlers
      .handle("register", ({ payload }) =>
        Effect.gen(function* () {
          const ip = yield* clientKey
          yield* rateLimiter.check("register", ip)
          yield* rateLimiter.check("registerByEmail", payload.email)
          return yield* auth.register(payload).pipe(Effect.catchTag("DbError", Effect.orDie))
        }),
      )
      .handle("login", ({ payload }) =>
        Effect.gen(function* () {
          const ip = yield* clientKey
          yield* rateLimiter.check("login", ip)
          return yield* auth.login(payload).pipe(Effect.catchTag("DbError", Effect.orDie))
        }),
      )
      .handle("refresh", ({ payload }) =>
        Effect.gen(function* () {
          const ip = yield* clientKey
          yield* rateLimiter.check("refresh", ip)
          return yield* auth.refresh(payload.refreshToken).pipe(Effect.catchTag("DbError", Effect.orDie))
        }),
      )
      .handle("verifyEmail", ({ payload }) =>
        auth.verifyEmail(payload.token).pipe(Effect.catchTag("DbError", Effect.orDie)),
      )
      .handle("signOut", ({ payload }) =>
        Effect.gen(function* () {
          const ip = yield* clientKey
          yield* rateLimiter.check("signOut", ip)
          return yield* auth.signOut(payload.refreshToken).pipe(Effect.catchTag("DbError", Effect.orDie))
        }),
      )
      .handle("resendVerification", ({ payload }) =>
        Effect.gen(function* () {
          yield* rateLimiter.check("resendVerification", payload.email)
          return yield* auth.resendVerification(payload.email).pipe(Effect.catchTag("DbError", Effect.orDie))
        }),
      )
  }),
).pipe(
  Layer.provide(AuthService.layer),
  Layer.provide(UserRepository.layer),
  Layer.provide(OrganizationRepository.layer),
  Layer.provide(PasswordService.layer),
  Layer.provide(TokenService.layer),
  Layer.provide(EmailService.layer),
  Layer.provide(AppLogger.layer),
  Layer.provide(RateLimiterLive),
  Layer.provide(PgDatabaseLive),
  Layer.provide(SecretsService.layer),
)
