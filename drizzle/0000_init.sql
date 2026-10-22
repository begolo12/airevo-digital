CREATE SCHEMA "family";
--> statement-breakpoint
CREATE SCHEMA "finance";
--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('cash', 'bank', 'ewallet', 'savings');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('cash', 'property', 'vehicle', 'gold', 'investment', 'other');--> statement-breakpoint
CREATE TYPE "public"."bill_frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'once');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."chore_frequency" AS ENUM('once', 'daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."chore_status" AS ENUM('todo', 'doing', 'done');--> statement-breakpoint
CREATE TYPE "public"."contact_provider" AS ENUM('resend', 'outbox');--> statement-breakpoint
CREATE TYPE "public"."debt_status" AS ENUM('active', 'paid', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."debt_type" AS ENUM('payable', 'receivable');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('identity', 'education', 'insurance', 'property', 'health', 'other');--> statement-breakpoint
CREATE TYPE "public"."education_level" AS ENUM('paud', 'sd', 'smp', 'sma', 'kuliah', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('birthday', 'anniversary', 'school', 'medical', 'family', 'other');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('emergency_fund', 'education', 'home', 'vehicle', 'retirement', 'hajj', 'wedding', 'vacation', 'custom');--> statement-breakpoint
CREATE TYPE "public"."health_type" AS ENUM('allergy', 'condition', 'medication', 'immunization', 'checkup', 'other');--> statement-breakpoint
CREATE TYPE "public"."insurance_period" AS ENUM('monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."insurance_status" AS ENUM('active', 'lapsed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."insurance_type" AS ENUM('health', 'life', 'vehicle', 'property', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('paid', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('none', 'yearly', 'monthly', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."relationship" AS ENUM('self', 'spouse', 'child', 'parent', 'sibling', 'other');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'adult', 'teen', 'child', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('household', 'shared', 'private');--> statement-breakpoint
CREATE TABLE "finance"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" DEFAULT 'bank' NOT NULL,
	"owner_member_id" uuid,
	"opening_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"color" text DEFAULT 'butter' NOT NULL,
	"is_shared" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" DEFAULT 'other' NOT NULL,
	"acquisition_value" numeric(18, 2),
	"current_value" numeric(18, 2) NOT NULL,
	"acquired_at" date,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."bill_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"transaction_id" uuid,
	"due_date" date NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"category_id" uuid,
	"account_id" uuid,
	"frequency" "bill_frequency" DEFAULT 'monthly' NOT NULL,
	"due_day" smallint DEFAULT 1 NOT NULL,
	"next_due_date" date NOT NULL,
	"reminder_days_before" smallint DEFAULT 3 NOT NULL,
	"status" "bill_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"month" date NOT NULL,
	"amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"rollover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"color" text DEFAULT 'butter' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family"."chores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assignee_member_id" uuid,
	"frequency" "chore_frequency" DEFAULT 'once' NOT NULL,
	"due_date" date,
	"status" "chore_status" DEFAULT 'todo' NOT NULL,
	"points" smallint DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"need" text NOT NULL,
	"budget" text,
	"message" text NOT NULL,
	"delivered" boolean DEFAULT false NOT NULL,
	"provider" "contact_provider" DEFAULT 'outbox' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"type" "debt_type" NOT NULL,
	"counterparty" text NOT NULL,
	"principal" numeric(18, 2) NOT NULL,
	"remaining" numeric(18, 2) NOT NULL,
	"interest_rate" numeric(5, 2),
	"installment_amount" numeric(18, 2),
	"due_date" date,
	"status" "debt_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family"."documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"member_id" uuid,
	"title" text NOT NULL,
	"category" "document_category" DEFAULT 'other' NOT NULL,
	"document_number" text,
	"issuer" text,
	"issued_at" date,
	"expires_at" date,
	"file_name" text,
	"visibility" "visibility" DEFAULT 'household' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family"."education_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"school" text NOT NULL,
	"level" "education_level" DEFAULT 'sd' NOT NULL,
	"academic_year" text NOT NULL,
	"annual_cost" numeric(18, 2),
	"goal_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "event_type" DEFAULT 'family' NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"all_day" boolean DEFAULT true NOT NULL,
	"location" text,
	"member_id" uuid,
	"recurrence" "recurrence" DEFAULT 'none' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"account_id" uuid,
	"transaction_id" uuid,
	"amount" numeric(18, 2) NOT NULL,
	"contributed_at" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "goal_type" DEFAULT 'custom' NOT NULL,
	"target_amount" numeric(18, 2) NOT NULL,
	"target_date" date,
	"saved_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"account_id" uuid,
	"member_id" uuid,
	"visibility" "visibility" DEFAULT 'household' NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family"."health_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"type" "health_type" DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"recorded_at" date NOT NULL,
	"next_at" date,
	"notes" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"currency" char(3) DEFAULT 'IDR' NOT NULL,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "finance"."insurances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"member_id" uuid,
	"type" "insurance_type" NOT NULL,
	"provider" text NOT NULL,
	"policy_number" text,
	"premium" numeric(18, 2) NOT NULL,
	"period" "insurance_period" DEFAULT 'monthly' NOT NULL,
	"next_due_date" date,
	"coverage" text,
	"status" "insurance_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"relationship" "relationship" DEFAULT 'other' NOT NULL,
	"role" "role" DEFAULT 'child' NOT NULL,
	"birth_date" date,
	"color" text DEFAULT 'butter' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family"."shopping_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"estimated_price" numeric(18, 2) DEFAULT '0' NOT NULL,
	"actual_price" numeric(18, 2),
	"checked" boolean DEFAULT false NOT NULL,
	"category_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"to_account_id" uuid,
	"category_id" uuid,
	"type" "tx_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"occurred_at" date NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"member_id" uuid,
	"visibility" "visibility" DEFAULT 'household' NOT NULL,
	"created_by" uuid,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"member_id" uuid,
	"role" "role" DEFAULT 'adult' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "finance"."accounts" ADD CONSTRAINT "accounts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."accounts" ADD CONSTRAINT "accounts_owner_member_id_household_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."assets" ADD CONSTRAINT "assets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."bill_payments" ADD CONSTRAINT "bill_payments_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."bill_payments" ADD CONSTRAINT "bill_payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "finance"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."bill_payments" ADD CONSTRAINT "bill_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "finance"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."bills" ADD CONSTRAINT "bills_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "finance"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."bills" ADD CONSTRAINT "bills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "finance"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."budgets" ADD CONSTRAINT "budgets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "finance"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."chores" ADD CONSTRAINT "chores_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."chores" ADD CONSTRAINT "chores_assignee_member_id_household_members_id_fk" FOREIGN KEY ("assignee_member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."debts" ADD CONSTRAINT "debts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."documents" ADD CONSTRAINT "documents_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."documents" ADD CONSTRAINT "documents_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."education_records" ADD CONSTRAINT "education_records_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."education_records" ADD CONSTRAINT "education_records_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."education_records" ADD CONSTRAINT "education_records_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "finance"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."events" ADD CONSTRAINT "events_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."events" ADD CONSTRAINT "events_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."goal_contributions" ADD CONSTRAINT "goal_contributions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "finance"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."goal_contributions" ADD CONSTRAINT "goal_contributions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "finance"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."goal_contributions" ADD CONSTRAINT "goal_contributions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "finance"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."goals" ADD CONSTRAINT "goals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."goals" ADD CONSTRAINT "goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "finance"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."goals" ADD CONSTRAINT "goals_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."health_records" ADD CONSTRAINT "health_records_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."health_records" ADD CONSTRAINT "health_records_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."insurances" ADD CONSTRAINT "insurances_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."insurances" ADD CONSTRAINT "insurances_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."shopping_items" ADD CONSTRAINT "shopping_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family"."shopping_items" ADD CONSTRAINT "shopping_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "finance"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "finance"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "finance"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "finance"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_household_idx" ON "finance"."accounts" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "assets_household_idx" ON "finance"."assets" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "audit_household_idx" ON "audit_logs" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bill_payment_unique_idx" ON "finance"."bill_payments" USING btree ("bill_id","due_date");--> statement-breakpoint
CREATE INDEX "bills_due_idx" ON "finance"."bills" USING btree ("household_id","next_due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_unique_idx" ON "finance"."budgets" USING btree ("household_id","category_id","month");--> statement-breakpoint
CREATE INDEX "categories_household_idx" ON "finance"."categories" USING btree ("household_id","kind");--> statement-breakpoint
CREATE INDEX "chores_household_idx" ON "family"."chores" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "debts_household_idx" ON "finance"."debts" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "documents_household_idx" ON "family"."documents" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "education_member_idx" ON "family"."education_records" USING btree ("household_id","member_id");--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "family"."events" USING btree ("household_id","date");--> statement-breakpoint
CREATE INDEX "contrib_goal_idx" ON "finance"."goal_contributions" USING btree ("goal_id","contributed_at");--> statement-breakpoint
CREATE INDEX "goals_household_idx" ON "finance"."goals" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "health_member_idx" ON "family"."health_records" USING btree ("household_id","member_id");--> statement-breakpoint
CREATE INDEX "insurances_household_idx" ON "finance"."insurances" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "members_household_idx" ON "household_members" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_user_idx" ON "household_members" USING btree ("household_id","user_id");--> statement-breakpoint
CREATE INDEX "shopping_household_idx" ON "family"."shopping_items" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "tx_household_date_idx" ON "finance"."transactions" USING btree ("household_id","occurred_at");--> statement-breakpoint
CREATE INDEX "tx_account_idx" ON "finance"."transactions" USING btree ("household_id","account_id");--> statement-breakpoint
CREATE INDEX "tx_category_idx" ON "finance"."transactions" USING btree ("household_id","category_id");--> statement-breakpoint
CREATE INDEX "users_member_idx" ON "users" USING btree ("member_id");