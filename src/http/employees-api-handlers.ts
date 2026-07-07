import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { PgDatabaseLive } from "../db"
import { DepartmentService } from "../domain/department-service"
import { EmployeeOnboardingService } from "../domain/employee-onboarding-service"
import { EmployeeService } from "../domain/employee-service"
import { DepartmentRepository } from "../repositories/department-repository"
import { EmployeeRepository } from "../repositories/employee-repository"
import { AppLogger } from "../services/app-logger"
import { CacheLive } from "../services/cache-service"
import { EmailService } from "../services/email-service"
import { TokenService } from "../services/token-service"
import { AuthorizationLayer, CurrentUser, requireRole } from "./auth-middleware"

const toDepartmentDTO = (row: { id: string; name: string; leadEmployeeId: string | null; createdAt: Date }) => ({
  id: row.id,
  name: row.name,
  leadEmployeeId: row.leadEmployeeId,
  createdAt: row.createdAt.toISOString(),
})

export const DepartmentsApiHandlers = HttpApiBuilder.group(Api, "departments", (handlers) =>
  Effect.gen(function* () {
    const departments = yield* DepartmentService

    return handlers
      .handle("list", () =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          const rows = yield* departments.list(user.organizationId)
          return rows.map(toDepartmentDTO)
        }),
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          const row = yield* departments.create(user.organizationId, payload)
          return toDepartmentDTO(row)
        }),
      )
      .handle("setLead", ({ params, payload }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          return yield* departments.setLead(user.organizationId, params.id, payload.leadEmployeeId)
        }),
      )
  }),
).pipe(
  Layer.provide(DepartmentService.layer),
  Layer.provide(DepartmentRepository.layer),
  Layer.provide(AuthorizationLayer),
  Layer.provide(TokenService.layer),
  Layer.provide(CacheLive),
  Layer.provide(PgDatabaseLive),
)

export const EmployeesApiHandlers = HttpApiBuilder.group(Api, "employees", (handlers) =>
  Effect.gen(function* () {
    const onboarding = yield* EmployeeOnboardingService

    const employees = yield* EmployeeService

    return handlers
      .handle("bulkOnboard", ({ payload }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          return yield* onboarding.bulkOnboard(user.organizationId, [...payload.rows])
        }),
      )

      .handle("list", ({ params }) =>
        Effect.gen(function* () {
          const user = yield* requireRole("owner", "admin", "hr_manager")
          return yield* employees.list(user.organizationId, {
            status: params.status,
            search: params.search,
            departmentId: params.departmentId,
            page: params.page ? Number(params.page) : undefined,
            limit: params.limit ? Number(params.limit) : undefined,
          })
        }),
      )
  }),
).pipe(
  Layer.provide(EmployeeOnboardingService.layer),
  Layer.provide(EmployeeRepository.layer),
  Layer.provide(TokenService.layer),
  Layer.provide(EmailService.layer),
  Layer.provide(AppLogger.layer),
  Layer.provide(AuthorizationLayer),
  Layer.provide(CacheLive),
  Layer.provide(PgDatabaseLive),
)
