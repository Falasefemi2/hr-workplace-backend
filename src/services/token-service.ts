import { createHash, randomBytes } from "node:crypto"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { errors as joseErrors, jwtVerify, SignJWT } from "jose"
import { SecretsService } from "./secrets-service"

export class TokenInvalidError extends Schema.TaggedErrorClass<TokenInvalidError>()("TokenInvalidError", {
  reason: Schema.String,
}) {}

export class TokenExpiredError extends Schema.TaggedErrorClass<TokenExpiredError>()("TokenExpiredError", {}) {}

export interface AccessTokenPayload {
  sub: string // userId
  orgId: string
  role: string
}

interface TokenServiceShape {
  signAccessToken: (payload: AccessTokenPayload) => Effect.Effect<string, never>
  verifyAccessToken: (token: string) => Effect.Effect<AccessTokenPayload, TokenInvalidError | TokenExpiredError>
  generateRefreshToken: () => Effect.Effect<{ token: string; tokenHash: string }, never>
  hashRefreshToken: (token: string) => Effect.Effect<string, never>
}

export class TokenService extends Context.Service<TokenService, TokenServiceShape>()("hr-workplace/TokenService") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const secrets = yield* SecretsService
      const accessSecretRaw = yield* secrets.getOrThrow("JWT_ACCESS_SECRET")
      const accessTtl = yield* secrets.getOrThrow("JWT_ACCESS_TTL")
      const accessSecret = new TextEncoder().encode(accessSecretRaw)

      const hashRefreshToken = (token: string) => Effect.sync(() => createHash("sha256").update(token).digest("hex"))

      const signAccessToken: TokenServiceShape["signAccessToken"] = (payload) =>
        Effect.promise(() =>
          new SignJWT({
            orgId: payload.orgId,
            role: payload.role,
          })
            .setProtectedHeader({
              alg: "HS256",
            })
            .setSubject(payload.sub)
            .setIssuedAt()
            .setExpirationTime(accessTtl)
            .sign(accessSecret),
        )

      const verifyAccessToken: TokenServiceShape["verifyAccessToken"] = (token) =>
        Effect.tryPromise({
          try: () => jwtVerify(token, accessSecret),
          catch: (cause) => {
            if (cause instanceof joseErrors.JWTExpired) {
              return new TokenExpiredError()
            }
            return new TokenInvalidError({
              reason: cause instanceof Error ? cause.message : "unknown",
            })
          },
        }).pipe(
          Effect.map(({ payload }) => ({
            sub: payload.sub as string,
            orgId: payload.orgId as string,
            role: payload.role as string,
          })),
        )

      const generateRefreshToken: TokenServiceShape["generateRefreshToken"] = () =>
        Effect.gen(function* () {
          const token = randomBytes(32).toString("hex")
          const tokenHash = yield* hashRefreshToken(token)
          return { token, tokenHash }
        })

      return {
        signAccessToken,
        verifyAccessToken,
        generateRefreshToken,
        hashRefreshToken,
      }
    }),
  )
}
