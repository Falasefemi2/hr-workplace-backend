import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { SecretNotFoundError } from "../errors"

export class SecretsService extends Context.Service<SecretsService>()("SecretsService", {
  make: Effect.sync(() => {
    const get = (key: string) =>
      Effect.sync(() => process.env[key]).pipe(
        Effect.flatMap((value) =>
          value
            ? Effect.succeed(value)
            : Effect.fail(
                new SecretNotFoundError({
                  key,
                }),
              ),
        ),
      )

    const getOrThrow = (key: string) => get(key).pipe(Effect.orDie)

    return { get, getOrThrow } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
