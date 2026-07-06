import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import {
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  RateLimitExceededError,
  TokenExpiredError,
  TokenInvalidError,
} from "../errors"

const AuthTokenSchema = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.String,
})

const PublicUserSchema = Schema.Struct({
  id: Schema.String,
  fullName: Schema.String,
  email: Schema.String,
  role: Schema.Literals(["owner", "admin", "hr_manager", "employee"]),
  organizationId: Schema.String,
})

const RegisterResponseSchema = Schema.Struct({
  user: PublicUserSchema,
  organization: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
  }),
  ...AuthTokenSchema.fields,
})

const PasswordSchema = Schema.String.pipe(
  Schema.check(Schema.isMinLength(8)),
  Schema.check(Schema.isPattern(/[A-Z]/)),
  Schema.check(Schema.isPattern(/[0-9]/)),
  Schema.check(Schema.isPattern(/[^A-Za-z0-9]/)),
  // Schema.check(Schema.isPattern(/[A-Z]/), { message: () => "Password must contain an uppercase letter" })
)

export class AuthApiGroup extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("register", "/auth/register", {
      payload: Schema.Struct({
        fullName: Schema.String.pipe(Schema.check(Schema.isMinLength(2)), Schema.check(Schema.isMaxLength(100))),
        email: Schema.String.pipe(Schema.check(Schema.isPattern(/^\S+@\S+\.\S+$/))),
        companyName: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
        phoneCountryCode: Schema.String,
        phoneNumber: Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{7,14}$/))),
        operatingCountry: Schema.String.pipe(Schema.check(Schema.isLengthBetween(2, 2))),
        orgSize: Schema.Literals(["1-10", "11-50", "51-200", "201-500", "500+"]),
        password: PasswordSchema,
      }),
      success: RegisterResponseSchema,
      error: [EmailAlreadyExistsError, RateLimitExceededError],
    }),
  )
  .add(
    HttpApiEndpoint.post("login", "/auth/login", {
      payload: Schema.Struct({
        email: Schema.String.pipe(Schema.check(Schema.isPattern(/^\S+@\S+\.\S+$/))),
        password: Schema.String.pipe(Schema.check(Schema.isMinLength(8))),
      }),
      success: Schema.Struct({ user: PublicUserSchema, ...AuthTokenSchema.fields }),
      error: [InvalidCredentialsError, RateLimitExceededError, EmailNotVerifiedError],
    }),
  )
  .add(
    HttpApiEndpoint.post("refresh", "/auth/refresh", {
      payload: Schema.Struct({ refreshToken: Schema.String }),
      success: AuthTokenSchema,
      error: [TokenInvalidError, TokenExpiredError, RateLimitExceededError],
    }),
  )
  .add(
    HttpApiEndpoint.post("verifyEmail", "/auth/verify-email", {
      payload: Schema.Struct({ token: Schema.String }),
      success: Schema.Void,
      error: [TokenInvalidError, TokenExpiredError],
    }),
  )
  .add(
    HttpApiEndpoint.post("signOut", "/auth/sign-out", {
      payload: Schema.Struct({ refreshToken: Schema.String }),
      success: Schema.Void,
      error: [RateLimitExceededError],
    }),
  )
  .add(
    HttpApiEndpoint.post("resendVerification", "/auth/resend-verification", {
      payload: Schema.Struct({ email: Schema.String }),
      success: Schema.Void,
      error: [RateLimitExceededError],
    }),
  ) {}
