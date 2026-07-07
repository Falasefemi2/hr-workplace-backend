import { eq } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgDatabase } from "../db"
import { emailVerificationTokens, type NewUser, passwordResetTokens, refreshTokens, users } from "../db/schema"
import { DbError, EmailAlreadyExistsError, UserNotFoundError } from "../errors"

const PG_UNIQUE_VIOLATION = "23505"

const toDbError = (cause: unknown) => new DbError({ cause })

export class UserRepository extends Context.Service<UserRepository>()("hr-workplace/UserRepository", {
  make: Effect.gen(function* () {
    const db = yield* PgDatabase

    const create = (data: NewUser) =>
      db
        .insert(users)
        .values(data)
        .returning()
        .pipe(
          Effect.map((r) => r[0]!),
          Effect.mapError((cause: any) =>
            cause?.code === PG_UNIQUE_VIOLATION ? new EmailAlreadyExistsError({ email: data.email }) : toDbError(cause),
          ),
        )

    const findByEmail = (email: string) =>
      db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .pipe(
          Effect.map((rows) => rows[0]),
          Effect.mapError(toDbError),
        )

    const findById = (id: string) =>
      db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .pipe(
          Effect.mapError(toDbError),
          Effect.flatMap((rows) =>
            rows[0] ? Effect.succeed(rows[0]) : Effect.fail(new UserNotFoundError({ userId: id })),
          ),
        )

    const markEmailVerified = (userId: string) =>
      db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, userId))
        .pipe(Effect.asVoid, Effect.mapError(toDbError))

    const storeRefreshToken = (params: { userId: string; tokenHash: string; expiresAt: Date }) =>
      db
        .insert(refreshTokens)
        .values(params)
        .returning()
        .pipe(
          Effect.map((r) => r[0]!),
          Effect.mapError(toDbError),
        )

    const findRefreshTokenByHash = (tokenHash: string) =>
      db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .pipe(
          Effect.map((rows) => rows[0]),
          Effect.mapError(toDbError),
        )

    const revokeRefreshToken = (id: string, replacedByTokenId?: string) =>
      db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), replacedByTokenId })
        .where(eq(refreshTokens.id, id))
        .pipe(Effect.asVoid, Effect.mapError(toDbError))

    const storeEmailVerificationToken = (params: { userId: string; tokenHash: string; expiresAt: Date }) =>
      db.insert(emailVerificationTokens).values(params).pipe(Effect.asVoid, Effect.mapError(toDbError))

    const findEmailVerificationTokenByHash = (tokenHash: string) =>
      db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.tokenHash, tokenHash))
        .pipe(
          Effect.map((rows) => rows[0]),
          Effect.mapError(toDbError),
        )

    const consumeEmailVerificationToken = (id: string) =>
      db
        .update(emailVerificationTokens)
        .set({ consumedAt: new Date() })
        .where(eq(emailVerificationTokens.id, id))
        .pipe(Effect.asVoid, Effect.mapError(toDbError))

    const storePasswordResetToken = (params: { userId: string; tokenHash: string; expiresAt: Date }) =>
      db.insert(passwordResetTokens).values(params).pipe(Effect.asVoid, Effect.mapError(toDbError))

    const findPasswordResetTokenByHash = (tokenHash: string) =>
      db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash))
        .pipe(
          Effect.map((rows) => rows[0]),
          Effect.mapError(toDbError),
        )

    const consumePasswordResetToken = (id: string) =>
      db
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetTokens.id, id))
        .pipe(Effect.asVoid, Effect.mapError(toDbError))

    const updatePassword = (userId: string, passwordHash: string) =>
      db.update(users).set({ passwordHash }).where(eq(users.id, userId)).pipe(Effect.asVoid, Effect.mapError(toDbError))

    const revokeAllUserRefreshTokens = (userId: string) =>
      db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, userId))
        .pipe(Effect.asVoid, Effect.mapError(toDbError))

    return {
      create,
      findByEmail,
      findById,
      markEmailVerified,
      storeRefreshToken,
      findRefreshTokenByHash,
      revokeRefreshToken,
      storeEmailVerificationToken,
      findEmailVerificationTokenByHash,
      consumeEmailVerificationToken,
      storePasswordResetToken,
      findPasswordResetTokenByHash,
      consumePasswordResetToken,
      updatePassword,
      revokeAllUserRefreshTokens,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
