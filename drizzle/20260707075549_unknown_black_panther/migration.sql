CREATE TABLE "pay_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"apply_tax_settings" boolean DEFAULT true NOT NULL,
	"apply_pension_settings" boolean DEFAULT true NOT NULL,
	"apply_nhf_settings" boolean DEFAULT true NOT NULL,
	"apply_nsitf_settings" boolean DEFAULT true NOT NULL,
	"apply_salary_breakdown" boolean DEFAULT true NOT NULL,
	"enable_thirteenth_month_bonus" boolean DEFAULT false NOT NULL,
	"apply_thirteenth_month_bonus_percentage" boolean DEFAULT false NOT NULL,
	"thirteenth_month_bonus_percentage" numeric(5,2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "pay_group_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "pay_groups_org_name_unique_idx" ON "pay_groups" ("organization_id","name");--> statement-breakpoint
CREATE INDEX "pay_groups_org_idx" ON "pay_groups" ("organization_id");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_pay_group_id_pay_groups_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "pay_groups"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "pay_groups" ADD CONSTRAINT "pay_groups_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;