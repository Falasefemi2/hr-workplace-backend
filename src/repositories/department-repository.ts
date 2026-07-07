import { and, eq } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgDatabase } from "../db"
import { departments, type NewDepartment } from "../db/schema"
import { DbError, DepartmentNameTakenError, DepartmentNotFoundError } from "../errors"

const PG_UNIQUE_VIOLATION = "23505"
const toDbError = (cause: unknown) => new DbError({ cause })

export class DepartmentRepository extends Context.Service<DepartmentRepository>()("hr-workplace/DepartmentRepository", {
  make: Effect.gen(function* () {
    const db = yield* PgDatabase

    const create = (data: NewDepartment) =>
      db
        .insert(departments)
        .values(data)
        .returning()
        .pipe(
          Effect.map((r) => r[0]!),
          Effect.mapError((cause: any) =>
            cause?.code === PG_UNIQUE_VIOLATION ? new DepartmentNameTakenError({ name: data.name }) : toDbError(cause),
          ),
        )

    const listByOrg = (organizationId: string) =>
      db
        .select()
        .from(departments)
        .where(eq(departments.organizationId, organizationId))
        .pipe(Effect.mapError(toDbError))

    const findById = (organizationId: string, id: string) =>
      db
        .select()
        .from(departments)
        .where(and(eq(departments.id, id), eq(departments.organizationId, organizationId)))
        .pipe(
          Effect.mapError(toDbError),
          Effect.flatMap((rows) =>
            rows[0] ? Effect.succeed(rows[0]) : Effect.fail(new DepartmentNotFoundError({ departmentId: id })),
          ),
        )

    const setLead = (organizationId: string, id: string, leadEmployeeId: string | null) =>
      db
        .update(departments)
        .set({ leadEmployeeId, updatedAt: new Date() })
        .where(and(eq(departments.id, id), eq(departments.organizationId, organizationId)))
        .pipe(Effect.asVoid, Effect.mapError(toDbError))

    return { create, listByOrg, findById, setLead } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
