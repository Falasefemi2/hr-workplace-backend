import { defineRelations } from "drizzle-orm"
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"

export const orgSizeEnum = pgEnum("org_size", ["1-10", "11-50", "51-200", "201-500", "500+"])

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "hr_manager", "employee"])

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    operatingCountry: varchar("operating_country", {
      length: 2,
    }).notNull(),
    orgSize: orgSizeEnum("org_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("organizations_country_idx").on(t.operatingCountry)],
)

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phoneCountryCode: varchar("phone_country_code", {
      length: 5,
    }).notNull(), // "+234"
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("owner"),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
    }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_email_unique_idx").on(t.email),
    index("users_org_id_idx").on(t.organizationId),
    uniqueIndex("users_phone_unique_idx").on(t.phoneCountryCode, t.phoneNumber),
  ],
)

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("refresh_tokens_user_id_idx").on(t.userId), index("refresh_tokens_token_hash_idx").on(t.tokenHash)],
)

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("evt_user_id_idx").on(t.userId)],
)

export const relations = defineRelations(
  {
    organizations,
    users,
    refreshTokens,
    emailVerificationTokens,
  },
  (r) => ({
    organizations: {
      users: r.many.users(),
    },
    users: {
      organization: r.one.organizations({
        from: r.users.organizationId,
        to: r.organizations.id,
      }),
      refreshTokens: r.many.refreshTokens(),
      emailVerificationTokens: r.many.emailVerificationTokens(),
    },
    refreshTokens: {
      user: r.one.users({
        from: r.refreshTokens.userId,
        to: r.users.id,
      }),
    },
    emailVerificationTokens: {
      user: r.one.users({
        from: r.emailVerificationTokens.userId,
        to: r.users.id,
      }),
    },
  }),
)

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert
