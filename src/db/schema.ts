import { defineRelations } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const orgSizeEnum = pgEnum("org_size", ["1-10", "11-50", "51-200", "201-500", "500+"])

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "hr_manager", "employee"])

export const employeeStatusEnum = pgEnum("employee_status", ["invited", "active", "deactivated"])

export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"])

export const okrWorkflowEnum = pgEnum("okr_workflow", ["simplified", "flat"])

export const objectiveStatusEnum = pgEnum("objective_status", ["draft", "published", "archived"])

export const keyResultTargetTypeEnum = pgEnum("key_result_target_type", ["number", "percentage", "currency"])

export const appraisalPeriodEnum = pgEnum("appraisal_period", ["quarterly", "half_yearly", "annually"])

export const appraisalReviewerTypeEnum = pgEnum("appraisal_reviewer_type", ["department_lead", "email_invite"])

export const appraisalStatusEnum = pgEnum("appraisal_status", ["not_started", "in_progress", "completed"])

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

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
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
  (t) => [index("prt_user_id_idx").on(t.userId), index("prt_token_hash_idx").on(t.tokenHash)],
)

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    leadEmployeeId: uuid("lead_employee_id"), // FK added below after employees table (circular)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("departments_org_name_unique_idx").on(t.organizationId, t.name),
    index("departments_org_idx").on(t.organizationId),
  ],
)

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // set once invite is accepted
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    gender: genderEnum("gender"),
    country: varchar("country", { length: 2 }),
    phoneNumber: varchar("phone_number", { length: 20 }),
    monthlyGross: numeric("monthly_gross", { precision: 14, scale: 2 }),
    status: employeeStatusEnum("status").notNull().default("invited"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    payGroupId: uuid("pay_group_id").references(() => payGroups.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("employees_org_email_unique_idx").on(t.organizationId, t.email),
    index("employees_org_idx").on(t.organizationId),
    index("employees_department_idx").on(t.departmentId),
  ],
)

export const employeeInvitationTokens = pgTable(
  "employee_invitation_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("eit_employee_idx").on(t.employeeId)],
)

export const payGroups = pgTable(
  "pay_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    applyTaxSettings: boolean("apply_tax_settings").notNull().default(true),
    applyPensionSettings: boolean("apply_pension_settings").notNull().default(true),
    applyNhfSettings: boolean("apply_nhf_settings").notNull().default(true),
    applyNsitfSettings: boolean("apply_nsitf_settings").notNull().default(true),
    applySalaryBreakdown: boolean("apply_salary_breakdown").notNull().default(true),
    enableThirteenthMonthBonus: boolean("enable_thirteenth_month_bonus").notNull().default(false),
    applyThirteenthMonthBonusPercentage: boolean("apply_thirteenth_month_bonus_percentage").notNull().default(false),
    thirteenthMonthBonusPercentage: numeric("thirteenth_month_bonus_percentage", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("pay_groups_org_name_unique_idx").on(t.organizationId, t.name),
    index("pay_groups_org_idx").on(t.organizationId),
  ],
)

export const objectives = pgTable(
  "objectives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workflow: okrWorkflowEnum("workflow").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    periodYear: integer("period_year").notNull(),
    periodQuarter: integer("period_quarter"), // 1-4, null = whole-year objective
    deadline: date("deadline"),
    status: objectiveStatusEnum("status").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("objectives_org_idx").on(t.organizationId),
    index("objectives_org_period_idx").on(t.organizationId, t.periodYear, t.periodQuarter),
  ],
)

export const objectiveDepartments = pgTable(
  "objective_departments",
  {
    objectiveId: uuid("objective_id")
      .notNull()
      .references(() => objectives.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.objectiveId, t.departmentId] }),
    index("objective_departments_department_idx").on(t.departmentId),
  ],
)

export const keyResults = pgTable(
  "key_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectiveId: uuid("objective_id")
      .notNull()
      .references(() => objectives.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    title: varchar("title", { length: 500 }).notNull(),
    targetType: keyResultTargetTypeEnum("target_type").notNull().default("number"),
    targetValue: numeric("target_value", { precision: 14, scale: 2 }).notNull(),
    currentValue: numeric("current_value", { precision: 14, scale: 2 }).notNull().default("0"),
    unit: varchar("unit", { length: 20 }),
    assignedEmployeeId: uuid("assigned_employee_id").references(() => employees.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("key_results_objective_idx").on(t.objectiveId),
    index("key_results_department_idx").on(t.departmentId),
    index("key_results_assigned_employee_idx").on(t.assignedEmployeeId),
  ],
)

export const appraisals = pgTable(
  "appraisals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    period: appraisalPeriodEnum("period").notNull(),
    reviewerType: appraisalReviewerTypeEnum("reviewer_type").notNull(),
    reviewerEmployeeId: uuid("reviewer_employee_id").references(() => employees.id, { onDelete: "set null" }),
    reviewerName: varchar("reviewer_name", { length: 255 }).notNull(),
    reviewerEmail: varchar("reviewer_email", { length: 320 }),
    startDate: date("start_date").notNull(),
    dueDate: date("due_date").notNull(),
    status: appraisalStatusEnum("status").notNull().default("not_started"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("appraisals_org_idx").on(t.organizationId),
    index("appraisals_org_status_idx").on(t.organizationId, t.status),
    index("appraisals_reviewer_employee_idx").on(t.reviewerEmployeeId),
  ],
)

export const appraisalEmployees = pgTable(
  "appraisal_employees",
  {
    appraisalId: uuid("appraisal_id")
      .notNull()
      .references(() => appraisals.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.appraisalId, t.employeeId] }),
    index("appraisal_employees_employee_idx").on(t.employeeId),
  ],
)

export const relations = defineRelations(
  {
    organizations,
    users,
    refreshTokens,
    emailVerificationTokens,
    passwordResetTokens,
    departments,
    employees,
    payGroups,
    objectives,
    objectiveDepartments,
    keyResults,
    appraisals,
    appraisalEmployees,
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
      passwordResetTokens: r.many.passwordResetTokens(),
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
    passwordResetTokens: {
      user: r.one.users({
        from: r.passwordResetTokens.userId,
        to: r.users.id,
      }),
    },
    departments: {
      organization: r.one.organizations({ from: r.departments.organizationId, to: r.organizations.id }),
      employees: r.many.employees(),
    },
    employees: {
      organization: r.one.organizations({ from: r.employees.organizationId, to: r.organizations.id }),
      department: r.one.departments({ from: r.employees.departmentId, to: r.departments.id }),
      user: r.one.users({ from: r.employees.userId, to: r.users.id }),
      payGroup: r.one.payGroups({ from: r.employees.payGroupId, to: r.payGroups.id }),
    },
    payGroups: {
      organization: r.one.organizations({ from: r.payGroups.organizationId, to: r.organizations.id }),
      employees: r.many.employees(),
    },
    objectives: {
      organization: r.one.organizations({ from: r.objectives.organizationId, to: r.organizations.id }),
      createdBy: r.one.users({ from: r.objectives.createdByUserId, to: r.users.id }),
      departments: r.many.objectiveDepartments(),
      keyResults: r.many.keyResults(),
    },
    objectiveDepartments: {
      objective: r.one.objectives({ from: r.objectiveDepartments.objectiveId, to: r.objectives.id }),
      department: r.one.departments({ from: r.objectiveDepartments.departmentId, to: r.departments.id }),
    },
    keyResults: {
      objective: r.one.objectives({ from: r.keyResults.objectiveId, to: r.objectives.id }),
      department: r.one.departments({ from: r.keyResults.departmentId, to: r.departments.id }),
      assignedEmployee: r.one.employees({ from: r.keyResults.assignedEmployeeId, to: r.employees.id }),
    },
    appraisals: {
      organization: r.one.organizations({ from: r.appraisals.organizationId, to: r.organizations.id }),
      reviewerEmployee: r.one.employees({ from: r.appraisals.reviewerEmployeeId, to: r.employees.id }),
      createdBy: r.one.users({ from: r.appraisals.createdByUserId, to: r.users.id }),
      employees: r.many.appraisalEmployees(),
    },
    appraisalEmployees: {
      appraisal: r.one.appraisals({ from: r.appraisalEmployees.appraisalId, to: r.appraisals.id }),
      employee: r.one.employees({ from: r.appraisalEmployees.employeeId, to: r.employees.id }),
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

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert

export type Department = typeof departments.$inferSelect
export type NewDepartment = typeof departments.$inferInsert

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert

export type EmployeeInvitationToken = typeof employeeInvitationTokens.$inferSelect

export type PayGroup = typeof payGroups.$inferSelect
export type NewPayGroup = typeof payGroups.$inferInsert

export type Objective = typeof objectives.$inferSelect
export type NewObjective = typeof objectives.$inferInsert

export type KeyResult = typeof keyResults.$inferSelect
export type NewKeyResult = typeof keyResults.$inferInsert

export type Appraisal = typeof appraisals.$inferSelect
export type NewAppraisal = typeof appraisals.$inferInsert
