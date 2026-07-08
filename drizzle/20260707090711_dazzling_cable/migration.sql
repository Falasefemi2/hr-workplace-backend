CREATE TYPE "key_result_target_type" AS ENUM('number', 'percentage', 'currency');--> statement-breakpoint
CREATE TYPE "objective_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "okr_workflow" AS ENUM('simplified', 'flat');--> statement-breakpoint
CREATE TABLE "key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"objective_id" uuid NOT NULL,
	"department_id" uuid,
	"title" varchar(500) NOT NULL,
	"target_type" "key_result_target_type" DEFAULT 'number'::"key_result_target_type" NOT NULL,
	"target_value" numeric(14,2) NOT NULL,
	"current_value" numeric(14,2) DEFAULT '0' NOT NULL,
	"unit" varchar(20),
	"assigned_employee_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objective_departments" (
	"objective_id" uuid,
	"department_id" uuid,
	CONSTRAINT "objective_departments_pkey" PRIMARY KEY("objective_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"workflow" "okr_workflow" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"period_year" integer NOT NULL,
	"period_quarter" integer,
	"deadline" date,
	"status" "objective_status" DEFAULT 'draft'::"objective_status" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "key_results_objective_idx" ON "key_results" ("objective_id");--> statement-breakpoint
CREATE INDEX "key_results_department_idx" ON "key_results" ("department_id");--> statement-breakpoint
CREATE INDEX "key_results_assigned_employee_idx" ON "key_results" ("assigned_employee_id");--> statement-breakpoint
CREATE INDEX "objective_departments_department_idx" ON "objective_departments" ("department_id");--> statement-breakpoint
CREATE INDEX "objectives_org_idx" ON "objectives" ("organization_id");--> statement-breakpoint
CREATE INDEX "objectives_org_period_idx" ON "objectives" ("organization_id","period_year","period_quarter");--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_department_id_departments_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_assigned_employee_id_employees_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "objective_departments" ADD CONSTRAINT "objective_departments_objective_id_objectives_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objective_departments" ADD CONSTRAINT "objective_departments_department_id_departments_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");