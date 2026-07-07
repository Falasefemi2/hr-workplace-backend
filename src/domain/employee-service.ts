import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { EmployeeRepository } from "../repositories/employee-repository"

export class EmployeeService extends Context.Service<EmployeeService>()("hr-workplace/EmployeeService", {
  make: Effect.gen(function* () {
    const employeeRepo = yield* EmployeeRepository

    const list = (
      organizationId: string,
      params: {
        status?: "invited" | "active" | "deactivated"
        search?: string
        departmentId?: string
        page?: number
        limit?: number
      },
    ) => {
      const page = Math.max(1, params.page ?? 1)
      const limit = Math.min(100, Math.max(1, params.limit ?? 20)) // hard cap — never trust client-supplied limit unbounded
      return employeeRepo.listByOrg(organizationId, { ...params, page, limit }).pipe(
        Effect.map(({ data, total }) => ({
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        })),
        Effect.catchTag("DbError", Effect.orDie), // <-- add this
      )
    }

    return { list } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
