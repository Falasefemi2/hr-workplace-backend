import { PgClient } from "@effect/sql-pg"
import type { EffectPgDatabase } from "drizzle-orm/effect-postgres"
import * as DrizzleEffect from "drizzle-orm/effect-postgres"
import { Config, Context, Layer } from "effect"

export type PgDatabaseShape = EffectPgDatabase & { $client: PgClient.PgClient }

export class PgDatabase extends Context.Service<PgDatabase>()("hr-workplace/PgDatabase", {
  make: DrizzleEffect.makeWithDefaults(),
}) {}

const PgClientLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
  ssl: Config.boolean("DATABASE_SSL").pipe(Config.withDefault(false)),
})

export const PgDatabaseLive = Layer.effect(PgDatabase, PgDatabase.make).pipe(Layer.provide(PgClientLive))
