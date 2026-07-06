import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PasswordHashError } from "../errors"

export class PasswordService extends Context.Service<PasswordService>()("PasswordService", {
  make: Effect.sync(() => {
    const hash = (plaintext: string) =>
      Effect.tryPromise({
        try: () =>
          Bun.password.hash(plaintext, {
            algorithm: "argon2id",
            memoryCost: 19456,
            timeCost: 2,
          }),
        catch: (cause) =>
          new PasswordHashError({
            cause,
          }),
      })

    const verify = (plaintext: string, hashed: string) =>
      Effect.tryPromise({
        try: () => Bun.password.verify(plaintext, hashed),
        catch: (cause) =>
          new PasswordHashError({
            cause,
          }),
      })

    return { hash, verify } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
