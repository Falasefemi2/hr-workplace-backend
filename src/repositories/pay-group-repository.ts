import { and, eq } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgDatabase } from "../db"
import { type NewPayGroup, payGroups } from "../db/schema"
import { DbError, PayGroupNameTakenError, PayGroupNotFoundError } from "../errors"

const toDbError = (cause: unknown) => new DbError({ cause })

export class PayGroupRepository extends Context.Service<PayGroupRepository>()(
  "api/repositories/pay-group-repository/PayGroupRepository",
  {
    make: Effect.gen(function* () {
      const db = yield* PgDatabase

      const create = (data: NewPayGroup) =>
        db
          .insert(payGroups)
          .values(data)
          .returning()
          .pipe(
            Effect.map((r) => r[0]!),
            Effect.catchTag(
              "EffectDrizzleQueryError",
              (e): Effect.Effect<never, PayGroupNameTakenError | DbError> =>
                e.cause instanceof Error && /unique/i.test(e.cause.message)
                  ? Effect.fail(new PayGroupNameTakenError({ name: data.name }))
                  : Effect.fail(toDbError(e)),
            ),
          )

      const listByOrg = (organizationId: string) =>
        db.select().from(payGroups).where(eq(payGroups.organizationId, organizationId)).pipe(Effect.mapError(toDbError))

      const findById = (organizationId: string, id: string) =>
        db
          .select()
          .from(payGroups)
          .where(and(eq(payGroups.id, id), eq(payGroups.organizationId, organizationId)))
          .pipe(
            Effect.mapError(toDbError),
            Effect.flatMap((rows) =>
              rows[0] ? Effect.succeed(rows[0]) : Effect.fail(new PayGroupNotFoundError({ payGroupId: id })),
            ),
          )

      return { create, listByOrg, findById } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
