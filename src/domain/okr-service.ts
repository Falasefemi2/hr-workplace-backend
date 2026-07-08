import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { InvalidWorkflowOperationError, NotDepartmentLeadError, ObjectiveAlreadyPublishedError } from "../errors"
import { OkrRepository } from "../repositories/skr-repository"

interface KeyResultInput {
  title: string
  targetType: "number" | "percentage" | "currency"
  targetValue: string
  unit?: string
  assignedEmployeeId?: string
}

interface CreateObjectiveInput {
  workflow: "simplified" | "flat"
  title: string
  description?: string
  periodYear: number
  periodQuarter?: number
  deadline?: string
  departmentIds: string[]
  keyResults?: KeyResultInput[] // required for "flat", forbidden for "simplified"
  publish: boolean
}

export class OkrService extends Context.Service<OkrService>()("api/domain/okr-service/OkrService", {
  make: Effect.gen(function* () {
    const repo = yield* OkrRepository

    const createObjective = (organizationId: string, userId: string, input: CreateObjectiveInput) =>
      Effect.gen(function* () {
        if (input.workflow === "flat" && (!input.keyResults || input.keyResults.length === 0) && input.publish) {
          return yield* new InvalidWorkflowOperationError({
            message: "Flat workflow requires at least one key result before publishing",
          })
        }
        if (input.workflow === "simplified" && input.keyResults && input.keyResults.length > 0) {
          return yield* new InvalidWorkflowOperationError({
            message: "Simplified workflow does not accept key results at creation — HODs add them after publish",
          })
        }

        const objective = yield* repo.createObjective(
          {
            organizationId,
            workflow: input.workflow,
            title: input.title.trim(),
            description: input.description,
            periodYear: input.periodYear,
            periodQuarter: input.periodQuarter ?? null,
            deadline: input.deadline,
            status: input.publish ? "published" : "draft",
            createdByUserId: userId,
          },
          input.departmentIds,
        )

        if (input.workflow === "flat" && input.keyResults?.length) {
          yield* repo.createKeyResults(
            input.keyResults.map((kr) => ({
              objectiveId: objective.id,
              departmentId: null,
              title: kr.title,
              targetType: kr.targetType,
              targetValue: kr.targetValue,
              unit: kr.unit,
              assignedEmployeeId: kr.assignedEmployeeId,
              createdByUserId: userId,
            })),
          )
        }

        return objective
      })

    const list = (organizationId: string, filters: { year?: number; quarter?: number }) =>
      repo.listObjectives(organizationId, filters)

    const getDetail = (organizationId: string, objectiveId: string) =>
      Effect.gen(function* () {
        const objective = yield* repo.findObjectiveById(organizationId, objectiveId)
        const departmentIds = yield* repo.listDepartmentIdsForObjective(objectiveId)
        const keyResults = yield* repo.listKeyResultsForObjective(objectiveId)
        return { objective, departmentIds, keyResults }
      })

    const publish = (organizationId: string, objectiveId: string) =>
      Effect.gen(function* () {
        const objective = yield* repo.findObjectiveById(organizationId, objectiveId)
        if (objective.status === "published") {
          return yield* new ObjectiveAlreadyPublishedError({ objectiveId })
        }
        yield* repo.publishObjective(objectiveId)
      })

    const addKeyResultAsHod = (
      organizationId: string,
      userId: string,
      objectiveId: string,
      departmentId: string,
      input: KeyResultInput,
    ) =>
      Effect.gen(function* () {
        const objective = yield* repo.findObjectiveById(organizationId, objectiveId)

        if (objective.workflow !== "simplified") {
          return yield* new InvalidWorkflowOperationError({
            message: "Only simplified-workflow objectives accept HOD-created key results",
          })
        }
        if (objective.status !== "published") {
          return yield* new InvalidWorkflowOperationError({
            message: "Objective must be published before key results can be added",
          })
        }

        const assignedDepartmentIds = yield* repo.listDepartmentIdsForObjective(objectiveId)
        if (!assignedDepartmentIds.includes(departmentId)) {
          return yield* new InvalidWorkflowOperationError({
            message: "Department is not assigned to this objective",
          })
        }

        const isLead = yield* repo.isDepartmentLead(organizationId, userId, departmentId)
        if (!isLead) {
          return yield* new NotDepartmentLeadError({ departmentId })
        }

        const [created] = yield* repo.createKeyResults([
          {
            objectiveId,
            departmentId,
            title: input.title,
            targetType: input.targetType,
            targetValue: input.targetValue,
            unit: input.unit,
            assignedEmployeeId: input.assignedEmployeeId,
            createdByUserId: userId,
          },
        ])
        return created
      })

    return { createObjective, list, getDetail, publish, addKeyResultAsHod } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
