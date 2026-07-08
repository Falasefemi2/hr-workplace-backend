import { and, eq, inArray } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgDatabase } from "../db"
import { type Appraisal, appraisalEmployees, appraisals, type NewAppraisal } from "../db/schema"
import { AppraisalNotFoundError, DbError } from "../errors"

const toDbError = (cause: unknown) => new DbError({ cause })

export interface AppraisalWithEmployees extends Appraisal {
  employeeIds: readonly string[]
}

export interface AppraisalListFilters {
  status?: "not_started" | "in_progress" | "completed"
  search?: string // matches against employee name — handled at the service layer via a join, repo just filters by resolved employeeIds if provided
}

export class AppraisalRepository extends Context.Service<AppraisalRepository>()(
  "api/repositories/appraisal-repository/AppraisalRepository",
  {
    make: Effect.gen(function* () {
      const db = yield* PgDatabase

      const create = (data: NewAppraisal, employeeIds: readonly string[]) =>
        db
          .transaction((tx) =>
            Effect.gen(function* () {
              const [row] = yield* tx.insert(appraisals).values(data).returning()
              yield* tx
                .insert(appraisalEmployees)
                .values(employeeIds.map((employeeId) => ({ appraisalId: row!.id, employeeId })))
              return row!
            }),
          )
          .pipe(Effect.mapError(toDbError))

      const listByOrg = (organizationId: string, filters: AppraisalListFilters) =>
        db
          .select()
          .from(appraisals)
          .where(
            and(
              eq(appraisals.organizationId, organizationId),
              filters.status ? eq(appraisals.status, filters.status) : undefined,
            ),
          )
          .pipe(Effect.mapError(toDbError))

      const findEmployeeIdsForAppraisals = (appraisalIds: readonly string[]) =>
        appraisalIds.length === 0
          ? Effect.succeed([])
          : db
              .select()
              .from(appraisalEmployees)
              .where(inArray(appraisalEmployees.appraisalId, [...appraisalIds]))
              .pipe(Effect.mapError(toDbError))

      const findById = (organizationId: string, id: string) =>
        db
          .select()
          .from(appraisals)
          .where(and(eq(appraisals.id, id), eq(appraisals.organizationId, organizationId)))
          .pipe(
            Effect.mapError(toDbError),
            Effect.flatMap((rows) =>
              rows[0] ? Effect.succeed(rows[0]) : Effect.fail(new AppraisalNotFoundError({ appraisalId: id })),
            ),
          )

      const findEmployeeIdsForAppraisal = (appraisalId: string) =>
        db
          .select()
          .from(appraisalEmployees)
          .where(eq(appraisalEmployees.appraisalId, appraisalId))
          .pipe(
            Effect.mapError(toDbError),
            Effect.map((rows) => rows.map((r) => r.employeeId)),
          )

      const updateStatus = (organizationId: string, id: string, status: "not_started" | "in_progress" | "completed") =>
        db
          .update(appraisals)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(appraisals.id, id), eq(appraisals.organizationId, organizationId)))
          .pipe(Effect.mapError(toDbError))

      return {
        create,
        listByOrg,
        findEmployeeIdsForAppraisals,
        findById,
        findEmployeeIdsForAppraisal,
        updateStatus,
      } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
