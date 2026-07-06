import { eq } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgDatabase } from "../db"
import { type NewOrganization, organizations } from "../db/schema"
import { DbError } from "../errors"

export class OrganizationRepository extends Context.Service<OrganizationRepository>()(
  "api/repositories/organization-repository/OrganizationRepository",
  {
    make: Effect.gen(function* () {
      const db = yield* PgDatabase

      const create = (data: NewOrganization) =>
        db
          .insert(organizations)
          .values(data)
          .returning()
          .pipe(
            Effect.map((r) => r[0]!),
            Effect.mapError((cause) => new DbError({ cause })),
          )

      const findById = (id: string) =>
        db
          .select()
          .from(organizations)
          .where(eq(organizations.id, id))
          .pipe(
            Effect.map((rows) => rows[0]),
            Effect.mapError((cause) => new DbError({ cause })),
          )
      return { create, findById } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
