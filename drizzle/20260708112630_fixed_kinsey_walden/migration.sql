CREATE TYPE "appraisal_period" AS ENUM('quarterly', 'half_yearly', 'annually');--> statement-breakpoint
CREATE TYPE "appraisal_reviewer_type" AS ENUM('department_lead', 'email_invite');--> statement-breakpoint
CREATE TYPE "appraisal_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "appraisal_employees" (
	"appraisal_id" uuid,
	"employee_id" uuid,
	CONSTRAINT "appraisal_employees_pkey" PRIMARY KEY("appraisal_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "appraisals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"period" "appraisal_period" NOT NULL,
	"reviewer_type" "appraisal_reviewer_type" NOT NULL,
	"reviewer_employee_id" uuid,
	"reviewer_name" varchar(255) NOT NULL,
	"reviewer_email" varchar(320),
	"start_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "appraisal_status" DEFAULT 'not_started'::"appraisal_status" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "appraisal_employees_employee_idx" ON "appraisal_employees" ("employee_id");--> statement-breakpoint
CREATE INDEX "appraisals_org_idx" ON "appraisals" ("organization_id");--> statement-breakpoint
CREATE INDEX "appraisals_org_status_idx" ON "appraisals" ("organization_id","status");--> statement-breakpoint
CREATE INDEX "appraisals_reviewer_employee_idx" ON "appraisals" ("reviewer_employee_id");--> statement-breakpoint
ALTER TABLE "appraisal_employees" ADD CONSTRAINT "appraisal_employees_appraisal_id_appraisals_id_fkey" FOREIGN KEY ("appraisal_id") REFERENCES "appraisals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appraisal_employees" ADD CONSTRAINT "appraisal_employees_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_reviewer_employee_id_employees_id_fkey" FOREIGN KEY ("reviewer_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");