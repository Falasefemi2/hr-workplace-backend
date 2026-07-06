CREATE TYPE "org_size" AS ENUM('1-10', '11-50', '51-200', '201-500', '500+');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('owner', 'admin', 'hr_manager', 'employee');--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"operating_country" varchar(2) NOT NULL,
	"org_size" "org_size" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_token_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone_country_code" varchar(5) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'owner'::"user_role" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "evt_user_id_idx" ON "email_verification_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX "organizations_country_idx" ON "organizations" ("operating_country");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX "users_org_id_idx" ON "users" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique_idx" ON "users" ("phone_country_code","phone_number");--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;