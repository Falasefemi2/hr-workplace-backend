import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { DepartmentRepository } from "../repositories/department-repository"

export class DepartmentService extends Context.Service<DepartmentService>()("hr-workplace/DepartmentService", {
  make: Effect.gen(function* () {
    const deptRepo = yield* DepartmentRepository

    const list = (organizationId: string) =>
      deptRepo.listByOrg(organizationId).pipe(Effect.catchTag("DbError", Effect.orDie))

    const create = (organizationId: string, params: { name: string; leadEmployeeId?: string }) =>
      deptRepo
        .create({
          organizationId,
          name: params.name.trim(),
          leadEmployeeId: params.leadEmployeeId?.trim() || null,
        })
        .pipe(Effect.catchTag("DbError", Effect.orDie)) // <-- add this

    const setLead = (organizationId: string, departmentId: string, leadEmployeeId: string | null) =>
      Effect.gen(function* () {
        yield* deptRepo.findById(organizationId, departmentId) // 404s if not found/wrong org
        yield* deptRepo.setLead(organizationId, departmentId, leadEmployeeId)
      }).pipe(Effect.catchTag("DbError", Effect.orDie))

    return { create, list, setLead } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
