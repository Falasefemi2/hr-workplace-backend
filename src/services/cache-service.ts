import * as Cache from "effect/Cache"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Organization, User } from "../db/schema"

export const CacheKeys = {
  userById: (id: string) => `users:id:${id}`,
  orgById: (id: string) => `orgs:id:${id}`,
} as const

interface CacheServiceShape {
  getUser: (key: string, lookup: () => Effect.Effect<User, never>) => Effect.Effect<User>
  getOrganization: (key: string, lookup: () => Effect.Effect<Organization, never>) => Effect.Effect<Organization>
  invalidateUser: (userId: string) => Effect.Effect<void>
  invalidateOrganization: (orgId: string) => Effect.Effect<void>
}

export class CacheService extends Context.Service<CacheService, CacheServiceShape>()("hr-workplace/CacheService") {}

export const CacheLive = Layer.effect(
  CacheService,
  Effect.gen(function* () {
    const userCache = yield* Cache.make<string, User, never>({
      capacity: 1000,
      timeToLive: Duration.minutes(5),
      lookup: () => Effect.die("user cache miss — lookup must be supplied by caller"),
    })

    const orgCache = yield* Cache.make<string, Organization, never>({
      capacity: 500,
      timeToLive: Duration.minutes(10), // orgs mutate less often than users
      lookup: () => Effect.die("org cache miss — lookup must be supplied by caller"),
    })

    const getUser: CacheServiceShape["getUser"] = (key, lookup) =>
      Effect.gen(function* () {
        const cached = yield* Cache.get(userCache, key).pipe(
          Effect.catchDefect(() => Effect.succeed(null)),
          Effect.option,
        )
        if (cached._tag === "Some" && cached.value !== null) {
          yield* Effect.logDebug("Cache HIT: user", { key })
          return cached.value
        }
        yield* Effect.logDebug("Cache MISS: user", {
          key,
        })
        const data = yield* lookup()
        yield* Cache.set(userCache, key, data)
        return data
      })

    const getOrganization: CacheServiceShape["getOrganization"] = (key, lookup) =>
      Effect.gen(function* () {
        const cached = yield* Cache.get(orgCache, key).pipe(
          Effect.catchDefect(() => Effect.succeed(null)),
          Effect.option,
        )
        if (cached._tag === "Some" && cached.value !== null) {
          yield* Effect.logDebug("Cache HIT: organization", { key })
          return cached.value
        }
        yield* Effect.logDebug("Cache MISS: organization", { key })
        const data = yield* lookup()
        yield* Cache.set(orgCache, key, data)
        return data
      })

    const invalidateUser: CacheServiceShape["invalidateUser"] = (userId) =>
      Effect.gen(function* () {
        yield* Cache.invalidate(userCache, CacheKeys.userById(userId))
        yield* Effect.logDebug("Cache invalidated: user", { userId })
      })

    const invalidateOrganization: CacheServiceShape["invalidateOrganization"] = (orgId) =>
      Effect.gen(function* () {
        yield* Cache.invalidate(orgCache, CacheKeys.orgById(orgId))
        yield* Effect.logDebug("Cache invalidated: organization", { orgId })
      })

    return {
      getUser,
      getOrganization,
      invalidateUser,
      invalidateOrganization,
    }
  }),
)
