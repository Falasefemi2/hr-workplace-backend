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
