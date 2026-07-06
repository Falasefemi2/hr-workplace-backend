import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest"
import { RateLimiter } from "effect/unstable/persistence"
import { RateLimitExceededError } from "../errors"

const Limits = {
  register: { limit: 5, window: "1 hour" },
  registerByEmail: { limit: 3, window: "1 hour" },
  login: { limit: 10, window: "15 minutes" },
  refresh: { limit: 30, window: "1 hour" },
  passwordReset: { limit: 3, window: "1 hour" },
  resendVerification: { limit: 3, window: "15 minutes" },
  signOut: { limit: 30, window: "1 hour" },
} as const

interface RateLimiterServiceShape {
  check: (preset: keyof typeof Limits, key: string) => Effect.Effect<void, RateLimitExceededError>
}

export class RateLimiterService extends Context.Service<RateLimiterService, RateLimiterServiceShape>()(
  "hr-workplace/RateLimiterService",
) {}

export const RateLimiterLive = Layer.effect(
  RateLimiterService,
  Effect.gen(function* () {
    const withLimiter = yield* RateLimiter.makeWithRateLimiter

    const check: RateLimiterServiceShape["check"] = (preset, key) => {
      const { limit, window } = Limits[preset]
      return Effect.void.pipe(
        withLimiter({
          key: `${preset}:${key}`,
          limit,
          window,
          algorithm: "fixed-window",
          onExceeded: "fail",
        }),
        // TODO: RateLimiter.RateLimiterError may expose a real retry-after —
        // check its shape and thread it through instead of hardcoding 0.
        Effect.mapError(() => new RateLimitExceededError({ retryAfterMs: 0 })),
      )
    }

    return { check }
  }),
).pipe(Layer.provide(RateLimiter.layer), Layer.provide(RateLimiter.layerStoreMemory))

export const clientKey = Effect.gen(function* () {
  const request = yield* HttpServerRequest
  const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? request.headers["x-real-ip"] ?? "unknown"
  return ip
})
