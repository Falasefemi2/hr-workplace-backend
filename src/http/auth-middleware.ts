// packages/core/src/http/auth-middleware.ts
import { Context, Effect, Layer, Redacted } from "effect"
import { HttpApiMiddleware, HttpApiSecurity } from "effect/unstable/httpapi"
import { ForbiddenError, UnauthorizedError } from "../errors"
import { UserRepository } from "../repositories/user-repository"
import { CacheLive, CacheService } from "../services/cache-service"
import { TokenService } from "../services/token-service"

export type Role = "owner" | "admin" | "hr_manager" | "employee"

export class CurrentUser extends Context.Service<
  CurrentUser,
  {
    readonly userId: string
    readonly organizationId: string
    readonly role: Role
    readonly email: string
  }
>()("hr-workplace/auth/CurrentUser") {}

export class Authorization extends HttpApiMiddleware.Service<
  Authorization,
  { provides: CurrentUser; requires: never }
>()("hr-workplace/auth/Authorization", {
  requiredForClient: true,
  security: { bearer: HttpApiSecurity.bearer },
  error: UnauthorizedError,
}) {}

export const AuthorizationLayer = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const tokens = yield* TokenService
    const userRepo = yield* UserRepository
    const cache = yield* CacheService

    return Authorization.of({
      bearer: Effect.fn("Authorization.bearer")(function* (httpEffect, { credential }) {
        const token = Redacted.value(credential)

        const payload = yield* tokens
          .verifyAccessToken(token)
          .pipe(Effect.mapError((e) => new UnauthorizedError({ reason: e.message ?? "Invalid token" })))

        const cacheKey = `users:id:${payload.sub}`
        const cached = yield* cache.tryGetUser(cacheKey)

        const user =
          cached ??
          (yield* userRepo.findById(payload.sub).pipe(
            Effect.tap((u) => cache.setUser(cacheKey, u)),
            Effect.catchTag("UserNotFoundError", () =>
              Effect.fail(new UnauthorizedError({ reason: "User not found" })),
            ),
            Effect.orDie, // remaining error (DbError) becomes a defect, correctly separated from auth failures
          ))

        return yield* Effect.provideService(httpEffect, CurrentUser, {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role as Role,
          email: user.email,
        })
      }),
    })
  }),
).pipe(Layer.provide([TokenService.layer, UserRepository.layer, CacheLive]))

export const requireRole = (...roles: Role[]) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser
    if (!roles.includes(user.role)) {
      return yield* new ForbiddenError({ requiredRole: roles.join(" or ") })
    }
    return user
  })
