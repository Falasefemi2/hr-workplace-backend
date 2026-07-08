import { Schema } from "effect"

export class UserNotFoundError extends Schema.TaggedErrorClass<UserNotFoundError>()("UserNotFoundError", {
  userId: Schema.optional(Schema.String),
}) {}

export class DbError extends Schema.TaggedErrorClass<DbError>()("DbError", {
  cause: Schema.Unknown,
}) {}

export class CacheError extends Schema.TaggedErrorClass<CacheError>()("CacheError", { cause: Schema.Unknown }) {}

export class EmailDeliveryError extends Schema.TaggedErrorClass<EmailDeliveryError>()("EmailDeliveryError", {
  cause: Schema.Unknown,
}) {}

export class SecretNotFoundError extends Schema.TaggedErrorClass<SecretNotFoundError>()("SecretNotFoundError", {
  key: Schema.String,
}) {}

export class PasswordHashError extends Schema.TaggedErrorClass<PasswordHashError>()("PasswordHashError", {
  cause: Schema.Unknown,
}) {}

export class UnauthorizedError extends Schema.TaggedErrorClass<UnauthorizedError>()("UnauthorizedError", {
  reason: Schema.String,
}) {}

export class ForbiddenError extends Schema.TaggedErrorClass<ForbiddenError>()("ForbiddenError", {
  requiredRole: Schema.String,
}) {}

export class RateLimitExceededError extends Schema.TaggedErrorClass<RateLimitExceededError>()(
  "RateLimitExceededError",
  { retryAfterMs: Schema.Number },
  { httpApiStatus: 429 },
) {}

export class EmailAlreadyExistsError extends Schema.TaggedErrorClass<EmailAlreadyExistsError>()(
  "EmailAlreadyExistsError",
  { email: Schema.String },
  { httpApiStatus: 409 },
) {}

export class InvalidCredentialsError extends Schema.TaggedErrorClass<InvalidCredentialsError>()(
  "InvalidCredentialsError",
  {},
  { httpApiStatus: 401 },
) {}

export class EmailNotVerifiedError extends Schema.TaggedErrorClass<EmailNotVerifiedError>()(
  "EmailNotVerifiedError",
  {},
  { httpApiStatus: 403 },
) {}

export class TokenInvalidError extends Schema.TaggedErrorClass<TokenInvalidError>()(
  "TokenInvalidError",
  { reason: Schema.String },
  { httpApiStatus: 401 },
) {}

export class TokenExpiredError extends Schema.TaggedErrorClass<TokenExpiredError>()(
  "TokenExpiredError",
  {},
  { httpApiStatus: 401 },
) {}

export class DepartmentNotFoundError extends Schema.TaggedErrorClass<DepartmentNotFoundError>()(
  "DepartmentNotFoundError",
  { departmentId: Schema.String },
  { httpApiStatus: 404 },
) {}

export class DepartmentNameTakenError extends Schema.TaggedErrorClass<DepartmentNameTakenError>()(
  "DepartmentNameTakenError",
  { name: Schema.String },
  { httpApiStatus: 409 },
) {}

export class PayGroupNotFoundError extends Schema.TaggedErrorClass<PayGroupNotFoundError>()(
  "PayGroupNotFoundError",
  { payGroupId: Schema.String },
  { httpApiStatus: 404 },
) {}

export class PayGroupNameTakenError extends Schema.TaggedErrorClass<PayGroupNameTakenError>()(
  "PayGroupNameTakenError",
  { name: Schema.String },
  { httpApiStatus: 409 },
) {}

export class ObjectiveNotFoundError extends Schema.TaggedErrorClass<ObjectiveNotFoundError>()(
  "ObjectiveNotFoundError",
  { objectiveId: Schema.String },
  { httpApiStatus: 404 },
) {}

export class ObjectiveAlreadyPublishedError extends Schema.TaggedErrorClass<ObjectiveAlreadyPublishedError>()(
  "ObjectiveAlreadyPublishedError",
  { objectiveId: Schema.String },
  { httpApiStatus: 409 },
) {}

export class NotDepartmentLeadError extends Schema.TaggedErrorClass<NotDepartmentLeadError>()(
  "NotDepartmentLeadError",
  { departmentId: Schema.String },
  { httpApiStatus: 403 },
) {}

export class InvalidWorkflowOperationError extends Schema.TaggedErrorClass<InvalidWorkflowOperationError>()(
  "InvalidWorkflowOperationError",
  { message: Schema.String },
  { httpApiStatus: 400 },
) {}

export class AppraisalNotFoundError extends Schema.TaggedErrorClass<AppraisalNotFoundError>()(
  "AppraisalNotFoundError",
  {
    appraisalId: Schema.String,
  },
) {}

export class InvalidReviewerError extends Schema.TaggedErrorClass<InvalidReviewerError>()("InvalidReviewerError", {
  reason: Schema.String,
}) {}

export type AuthError =
  | InvalidCredentialsError
  | EmailAlreadyExistsError
  | UserNotFoundError
  | TokenExpiredError
  | TokenInvalidError
  | RateLimitExceededError
  | DbError
  | CacheError
  | EmailDeliveryError
  | SecretNotFoundError
