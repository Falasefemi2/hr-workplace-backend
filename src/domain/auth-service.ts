import { Context, Effect, Layer } from "effect"
import { EmailNotVerifiedError, InvalidCredentialsError, TokenInvalidError } from "../errors"
import { OrganizationRepository } from "../repositories/organization-repository"
import { UserRepository } from "../repositories/user-repository"
import { AppLogger } from "../services/app-logger"
import { EmailService } from "../services/email-service"
import { PasswordService } from "../services/password-service"
import { TokenService } from "../services/token-service"

interface RegisterInput {
  fullName: string
  email: string
  companyName: string
  phoneCountryCode: string
  phoneNumber: string
  operatingCountry: string
  orgSize: "1-10" | "11-50" | "51-200" | "201-500" | "500+"
  password: string
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

export class AuthService extends Context.Service<AuthService>()("api/domain/auth-service/AuthService", {
  make: Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const orgRepo = yield* OrganizationRepository
    const password = yield* PasswordService
    const tokens = yield* TokenService
    const email = yield* EmailService
    const logger = yield* AppLogger

    const issueSession = (user: { id: string; organizationId: string; role: string }) =>
      Effect.gen(function* () {
        const accessToken = yield* tokens.signAccessToken({
          sub: user.id,
          orgId: user.organizationId,
          role: user.role,
        })
        const { token: refreshToken, tokenHash } = yield* tokens.generateRefreshToken()
        yield* userRepo.storeRefreshToken({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        })
        return { accessToken, refreshToken }
      })

    const register = (input: RegisterInput) =>
      Effect.gen(function* () {
        const passwordHash = yield* password.hash(input.password).pipe(Effect.orDie)

        const { org, user } = yield* Effect.gen(function* () {
          const org = yield* orgRepo.create({
            name: input.companyName,
            operatingCountry: input.operatingCountry,
            orgSize: input.orgSize,
          })

          const user = yield* userRepo.create({
            organizationId: org.id,
            fullName: input.fullName,
            email: input.email.toLowerCase(),
            phoneCountryCode: input.phoneCountryCode,
            phoneNumber: input.phoneNumber,
            passwordHash,
            role: "owner",
          })

          return { org, user }
        })

        const { token: verificationToken, tokenHash } = yield* tokens.generateRefreshToken()
        yield* userRepo.storeEmailVerificationToken({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        })

        yield* email.sendVerificationEmail({ to: user.email, fullName: user.fullName, token: verificationToken }).pipe(
          Effect.catchTag("EmailError", (e) =>
            logger.error("Failed to send verification email post-signup", {
              userId: user.id,
              error: e.message,
            }),
          ),
        )

        const session = yield* issueSession(user)

        yield* logger.info("User registered", { userId: user.id, orgId: org.id })

        return { user, organization: org, ...session }
      })

    const login = (params: { email: string; password: string }) =>
      Effect.gen(function* () {
        const user = yield* userRepo.findByEmail(params.email.toLowerCase())
        if (!user) return yield* new InvalidCredentialsError()

        const valid = yield* password.verify(params.password, user.passwordHash).pipe(Effect.orDie)
        if (!valid) return yield* new InvalidCredentialsError()

        if (!user.emailVerifiedAt) return yield* new EmailNotVerifiedError()

        const session = yield* issueSession(user)

        yield* logger.info("User logged in", { userId: user.id })

        return { user, ...session }
      })

    const refresh = (presentedToken: string) =>
      Effect.gen(function* () {
        const tokenHash = yield* tokens.hashRefreshToken(presentedToken)
        const stored = yield* userRepo.findRefreshTokenByHash(tokenHash)

        if (!stored) return yield* new TokenInvalidError({ reason: "not_found" })

        if (stored.revokedAt) {
          yield* logger.warn("Refresh token reuse detected", { userId: stored.userId })
          return yield* new TokenInvalidError({ reason: "revoked_reuse" })
        }

        if (stored.expiresAt < new Date()) {
          return yield* new TokenInvalidError({ reason: "expired" })
        }

        const user = yield* userRepo.findById(stored.userId).pipe(Effect.orDie)

        const session = yield* issueSession(user)
        yield* userRepo.revokeRefreshToken(stored.id)

        return session
      })

    const verifyEmail = (presentedToken: string) =>
      Effect.gen(function* () {
        const tokenHash = yield* tokens.hashRefreshToken(presentedToken)
        const stored = yield* userRepo.findEmailVerificationTokenByHash(tokenHash)

        if (!stored || stored.consumedAt || stored.expiresAt < new Date()) {
          return yield* new TokenInvalidError({ reason: "invalid_or_expired" })
        }

        yield* userRepo.markEmailVerified(stored.userId)
        yield* userRepo.consumeEmailVerificationToken(stored.id)

        yield* logger.info("Email verified", { userId: stored.userId })
      })

    const signOut = (presentedToken: string) =>
      Effect.gen(function* () {
        const tokenHash = yield* tokens.hashRefreshToken(presentedToken)
        const stored = yield* userRepo.findRefreshTokenByHash(tokenHash)
        if (!stored || stored.revokedAt) return
        yield* userRepo.revokeRefreshToken(stored.id)
      })

    const resendVerification = (emailAddress: string) =>
      Effect.gen(function* () {
        const user = yield* userRepo.findByEmail(emailAddress.toLowerCase())
        if (!user || user.emailVerifiedAt) return

        const { token, tokenHash } = yield* tokens.generateRefreshToken()
        yield* userRepo.storeEmailVerificationToken({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        })

        yield* email
          .sendVerificationEmail({ to: user.email, fullName: user.fullName, token })
          .pipe(
            Effect.catchTag("EmailError", (e) =>
              logger.error("Resend verification failed", { userId: user.id, error: e.message }),
            ),
          )
      })

    const forgotPassword = (emailAddress: string) =>
      Effect.gen(function* () {
        const user = yield* userRepo.findByEmail(emailAddress.toLowerCase())
        if (!user) return

        const { token, tokenHash } = yield* tokens.generateRefreshToken()
        const oneHour = 60 * 60 * 1000
        yield* userRepo.storePasswordResetToken({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + oneHour),
        })

        yield* email
          .sendPasswordResetEmail({ to: user.email, fullName: user.fullName, token })
          .pipe(
            Effect.catchTag("EmailError", (e) =>
              logger.error("Forgot password email failed", { userId: user.id, error: e.message }),
            ),
          )
      })

    const resetPassword = (params: { token: string; password: string }) =>
      Effect.gen(function* () {
        const tokenHash = yield* tokens.hashRefreshToken(params.token)
        const stored = yield* userRepo.findPasswordResetTokenByHash(tokenHash)

        if (!stored || stored.consumedAt || stored.expiresAt < new Date()) {
          return yield* new TokenInvalidError({ reason: "invalid_or_expired" })
        }

        const user = yield* userRepo.findById(stored.userId).pipe(Effect.orDie)

        const passwordHash = yield* password.hash(params.password).pipe(Effect.orDie)
        yield* userRepo.updatePassword(stored.userId, passwordHash)
        yield* userRepo.consumePasswordResetToken(stored.id)
        yield* userRepo.revokeAllUserRefreshTokens(stored.userId)

        yield* email
          .sendPasswordChangedEmail({ to: user.email, fullName: user.fullName })
          .pipe(
            Effect.catchTag("EmailError", (e) =>
              logger.error("Password changed confirmation email failed", { userId: user.id, error: e.message }),
            ),
          )

        yield* logger.info("Password reset successful", { userId: stored.userId })
      })

    return {
      register,
      login,
      refresh,
      verifyEmail,
      signOut,
      resendVerification,
      forgotPassword,
      resetPassword,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
