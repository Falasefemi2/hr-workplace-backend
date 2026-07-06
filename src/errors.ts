import { Schema } from "effect"

export class InvalidCredentialsError extends Schema.TaggedErrorClass<InvalidCredentialsError>()(
  "InvalidCredentialsError",
  {},
) {}

export class EmailAlreadyExistsError extends Schema.TaggedErrorClass<EmailAlreadyExistsError>()(
  "EmailAlreadyExistsError",
  { email: Schema.String },
) {}

export class UserNotFoundError extends Schema.TaggedErrorClass<UserNotFoundError>()("UserNotFoundError", {
  userId: Schema.optional(Schema.String),
}) {}

export class TokenExpiredError extends Schema.TaggedErrorClass<TokenExpiredError>()("TokenExpiredError", {}) {}

export class TokenInvalidError extends Schema.TaggedErrorClass<TokenInvalidError>()("TokenInvalidError", {
  reason: Schema.String,
}) {}

export class RateLimitExceededError extends Schema.TaggedErrorClass<RateLimitExceededError>()(
  "RateLimitExceededError",
  { retryAfterMs: Schema.Number },
) {}

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

export class EmailNotVerifiedError extends Schema.TaggedErrorClass<EmailNotVerifiedError>()(
  "EmailNotVerifiedError",
  {},
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
