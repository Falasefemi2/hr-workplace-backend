import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export class AppLogger extends Context.Service<AppLogger>()("hr-workplace/AppLogger", {
  make: Effect.sync(() => {
    const withCtx = <A, E, R>(effect: Effect.Effect<A, E, R>, fields: Record<string, unknown> = {}) =>
      Effect.annotateLogs(effect, fields)

    return {
      info: (msg: string, fields?: Record<string, unknown>) => withCtx(Effect.log(msg), fields),
      warn: (msg: string, fields?: Record<string, unknown>) => withCtx(Effect.logWarning(msg), fields),
      error: (msg: string, fields?: Record<string, unknown>) => withCtx(Effect.logError(msg), fields),
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
