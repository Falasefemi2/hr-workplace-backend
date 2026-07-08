import { and, eq } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgDatabase } from "../db"
import {
  departments,
  employees,
  keyResults,
  type NewKeyResult,
  type NewObjective,
  objectiveDepartments,
  objectives,
} from "../db/schema"
import { DbError, ObjectiveNotFoundError } from "../errors"

const toDbError = (cause: unknown) => new DbError({ cause })

export class ObjectiveRepository extends Context.Service<ObjectiveRepository>()(
  "api/repositories/objective-repository/ObjectiveRepository",
  {
    make: Effect.gen(function* () {
      const db = yield* PgDatabase

      const createObjective = (data: NewObjective, departmentIds: string[]) =>
        db
          .insert(objectives)
          .values(data)
          .returning()
          .pipe(
            Effect.map((r) => r[0]!),
            Effect.mapError(toDbError),
            Effect.flatMap((objective) =>
              departmentIds.length === 0
                ? Effect.succeed(objective)
                : db
                    .insert(objectiveDepartments)
                    .values(departmentIds.map((departmentId) => ({ objectiveId: objective.id, departmentId })))
                    .pipe(Effect.as(objective), Effect.mapError(toDbError)),
            ),
          )

      const createKeyResults = (rows: NewKeyResult[]) =>
        rows.length === 0
          ? Effect.succeed([])
          : db.insert(keyResults).values(rows).returning().pipe(Effect.mapError(toDbError))

      const findObjectiveById = (organizationId: string, id: string) =>
        db
          .select()
          .from(objectives)
          .where(and(eq(objectives.id, id), eq(objectives.organizationId, organizationId)))
          .pipe(
            Effect.mapError(toDbError),
            Effect.flatMap((rows) =>
              rows[0] ? Effect.succeed(rows[0]) : Effect.fail(new ObjectiveNotFoundError({ objectiveId: id })),
            ),
          )

      const listObjectives = (organizationId: string, filters: { year?: number; quarter?: number }) => {
        const conditions = [eq(objectives.organizationId, organizationId)]
        if (filters.year) conditions.push(eq(objectives.periodYear, filters.year))
        if (filters.quarter) conditions.push(eq(objectives.periodQuarter, filters.quarter))
        return db
          .select()
          .from(objectives)
          .where(and(...conditions))
          .pipe(Effect.mapError(toDbError))
      }

      const listDepartmentIdsForObjective = (objectiveId: string) =>
        db
          .select({ departmentId: objectiveDepartments.departmentId })
          .from(objectiveDepartments)
          .where(eq(objectiveDepartments.objectiveId, objectiveId))
          .pipe(
            Effect.map((rows) => rows.map((r) => r.departmentId)),
            Effect.mapError(toDbError),
          )

      const listKeyResultsForObjective = (objectiveId: string) =>
        db.select().from(keyResults).where(eq(keyResults.objectiveId, objectiveId)).pipe(Effect.mapError(toDbError))

      const publishObjective = (id: string) =>
        db
          .update(objectives)
          .set({ status: "published", updatedAt: new Date() })
          .where(eq(objectives.id, id))
          .pipe(Effect.asVoid, Effect.mapError(toDbError))

      const isDepartmentLead = (organizationId: string, userId: string, departmentId: string) =>
        db
          .select({ id: departments.id })
          .from(departments)
          .innerJoin(employees, eq(departments.leadEmployeeId, employees.id))
          .where(
            and(
              eq(departments.id, departmentId),
              eq(departments.organizationId, organizationId),
              eq(employees.userId, userId),
            ),
          )
          .pipe(
            Effect.map((rows) => rows.length > 0),
            Effect.mapError(toDbError),
          )

      return {
        createObjective,
        createKeyResults,
        findObjectiveById,
        listObjectives,
        listDepartmentIdsForObjective,
        listKeyResultsForObjective,
        publishObjective,
        isDepartmentLead,
      } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
