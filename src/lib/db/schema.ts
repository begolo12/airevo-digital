import {
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* --------------------------------------------------------------------------
 * Schema
 *
 * public  → identitas: user, household, anggota
 * finance → uang: akun, transaksi, anggaran, tagihan, tujuan, utang, aset
 * family  → kehidupan: agenda, tugas, dokumen, kesehatan, pendidikan, belanja
 * ------------------------------------------------------------------------ */

export const financeSchema = pgSchema("finance");
export const familySchema = pgSchema("family");

/* --------------------------------- enum ---------------------------------- */

export const roleEnum = pgEnum("role", [
  "owner",
  "adult",
  "teen",
  "child",
  "viewer",
]);

export const relationshipEnum = pgEnum("relationship", [
  "self",
  "spouse",
  "child",
  "parent",
  "sibling",
  "other",
]);

export const visibilityEnum = pgEnum("visibility", [
  "household",
  "shared",
  "private",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "ewallet",
  "savings",
]);

export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

export const txTypeEnum = pgEnum("tx_type", ["income", "expense", "transfer"]);

export const billFrequencyEnum = pgEnum("bill_frequency", [
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "yearly",
  "once",
]);

export const billStatusEnum = pgEnum("bill_status", ["active", "paused", "ended"]);

export const paymentStatusEnum = pgEnum("payment_status", ["paid", "skipped"]);

export const goalTypeEnum = pgEnum("goal_type", [
  "emergency_fund",
  "education",
  "home",
  "vehicle",
  "retirement",
  "hajj",
  "wedding",
  "vacation",
  "custom",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "achieved",
  "paused",
  "cancelled",
]);

export const debtTypeEnum = pgEnum("debt_type", ["payable", "receivable"]);
export const debtStatusEnum = pgEnum("debt_status", [
  "active",
  "paid",
  "written_off",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "cash",
  "property",
  "vehicle",
  "gold",
  "investment",
  "other",
]);

export const insuranceTypeEnum = pgEnum("insurance_type", [
  "health",
  "life",
  "vehicle",
  "property",
  "other",
]);

export const insurancePeriodEnum = pgEnum("insurance_period", [
  "monthly",
  "quarterly",
  "yearly",
]);

export const insuranceStatusEnum = pgEnum("insurance_status", [
  "active",
  "lapsed",
  "cancelled",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "identity",
  "education",
  "insurance",
  "property",
  "health",
  "other",
]);

export const healthTypeEnum = pgEnum("health_type", [
  "allergy",
  "condition",
  "medication",
  "immunization",
  "checkup",
  "other",
]);

export const educationLevelEnum = pgEnum("education_level", [
  "paud",
  "sd",
  "smp",
  "sma",
  "kuliah",
  "lainnya",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "birthday",
  "anniversary",
  "school",
  "medical",
  "family",
  "other",
]);

export const recurrenceEnum = pgEnum("recurrence", [
  "none",
  "yearly",
  "monthly",
  "weekly",
]);

export const choreStatusEnum = pgEnum("chore_status", ["todo", "doing", "done"]);
export const choreFrequencyEnum = pgEnum("chore_frequency", [
  "once",
  "daily",
  "weekly",
  "monthly",
]);

export const contactProviderEnum = pgEnum("contact_provider", [
  "resend",
  "outbox",
]);

/* --------------------------------- public -------------------------------- */

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  currency: char("currency", { length: 3 }).notNull().default("IDR"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable(
  "household_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    name: text("name").notNull(),
    relationship: relationshipEnum("relationship").notNull().default("other"),
    role: roleEnum("role").notNull().default("child"),
    birthDate: date("birth_date"),
    color: text("color").notNull().default("butter"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("members_household_idx").on(table.householdId),
    uniqueIndex("members_user_idx").on(table.householdId, table.userId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    role: roleEnum("role").notNull().default("adult"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_member_idx").on(table.memberId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_household_idx").on(table.householdId, table.createdAt)],
);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  need: text("need").notNull(),
  budget: text("budget"),
  message: text("message").notNull(),
  delivered: boolean("delivered").notNull().default(false),
  provider: contactProviderEnum("provider").notNull().default("outbox"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- finance -------------------------------- */

export const accounts = financeSchema.table(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull().default("bank"),
    ownerMemberId: uuid("owner_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    openingBalance: numeric("opening_balance", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    color: text("color").notNull().default("butter"),
    isShared: boolean("is_shared").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("accounts_household_idx").on(table.householdId)],
);

export const categories = financeSchema.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    color: text("color").notNull().default("butter"),
    isDefault: boolean("is_default").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("categories_household_idx").on(table.householdId, table.kind),
  ],
);

export const transactions = financeSchema.table(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    toAccountId: uuid("to_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    type: txTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    occurredAt: date("occurred_at").notNull(),
    description: text("description").notNull(),
    notes: text("notes"),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    visibility: visibilityEnum("visibility").notNull().default("household"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tx_household_date_idx").on(table.householdId, table.occurredAt),
    index("tx_account_idx").on(table.householdId, table.accountId),
    index("tx_category_idx").on(table.householdId, table.categoryId),
  ],
);

export const budgets = financeSchema.table(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    month: date("month").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
    rollover: boolean("rollover").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budget_unique_idx").on(table.householdId, table.categoryId, table.month),
  ],
);

export const bills = financeSchema.table(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    frequency: billFrequencyEnum("frequency").notNull().default("monthly"),
    dueDay: smallint("due_day").notNull().default(1),
    nextDueDate: date("next_due_date").notNull(),
    reminderDaysBefore: smallint("reminder_days_before").notNull().default(3),
    status: billStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bills_due_idx").on(table.householdId, table.nextDueDate)],
);

export const billPayments = financeSchema.table(
  "bill_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("paid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bill_payment_unique_idx").on(table.billId, table.dueDate),
  ],
);

export const goals = financeSchema.table(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: goalTypeEnum("type").notNull().default("custom"),
    targetAmount: numeric("target_amount", { precision: 18, scale: 2 }).notNull(),
    targetDate: date("target_date"),
    savedAmount: numeric("saved_amount", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    visibility: visibilityEnum("visibility").notNull().default("household"),
    status: goalStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("goals_household_idx").on(table.householdId, table.status)],
);

export const goalContributions = financeSchema.table(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    contributedAt: date("contributed_at").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contrib_goal_idx").on(table.goalId, table.contributedAt)],
);

export const debts = financeSchema.table(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    type: debtTypeEnum("type").notNull(),
    counterparty: text("counterparty").notNull(),
    principal: numeric("principal", { precision: 18, scale: 2 }).notNull(),
    remaining: numeric("remaining", { precision: 18, scale: 2 }).notNull(),
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
    installmentAmount: numeric("installment_amount", { precision: 18, scale: 2 }),
    dueDate: date("due_date"),
    status: debtStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("debts_household_idx").on(table.householdId, table.status)],
);

export const assets = financeSchema.table(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: assetTypeEnum("type").notNull().default("other"),
    acquisitionValue: numeric("acquisition_value", { precision: 18, scale: 2 }),
    currentValue: numeric("current_value", { precision: 18, scale: 2 }).notNull(),
    acquiredAt: date("acquired_at"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assets_household_idx").on(table.householdId)],
);

export const insurances = financeSchema.table(
  "insurances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    type: insuranceTypeEnum("type").notNull(),
    provider: text("provider").notNull(),
    policyNumber: text("policy_number"),
    premium: numeric("premium", { precision: 18, scale: 2 }).notNull(),
    period: insurancePeriodEnum("period").notNull().default("monthly"),
    nextDueDate: date("next_due_date"),
    coverage: text("coverage"),
    status: insuranceStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("insurances_household_idx").on(table.householdId)],
);

/* --------------------------------- family -------------------------------- */

export const events = familySchema.table(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: eventTypeEnum("type").notNull().default("family"),
    date: date("date").notNull(),
    time: text("time"),
    allDay: boolean("all_day").notNull().default(true),
    location: text("location"),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    recurrence: recurrenceEnum("recurrence").notNull().default("none"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("events_date_idx").on(table.householdId, table.date)],
);

export const chores = familySchema.table(
  "chores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assigneeMemberId: uuid("assignee_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    frequency: choreFrequencyEnum("frequency").notNull().default("once"),
    dueDate: date("due_date"),
    status: choreStatusEnum("status").notNull().default("todo"),
    points: smallint("points").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chores_household_idx").on(table.householdId, table.status)],
);

export const documents = familySchema.table(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    category: documentCategoryEnum("category").notNull().default("other"),
    documentNumber: text("document_number"),
    issuer: text("issuer"),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    fileName: text("file_name"),
    visibility: visibilityEnum("visibility").notNull().default("household"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("documents_household_idx").on(table.householdId)],
);

export const healthRecords = familySchema.table(
  "health_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    type: healthTypeEnum("type").notNull().default("other"),
    title: text("title").notNull(),
    recordedAt: date("recorded_at").notNull(),
    nextAt: date("next_at"),
    notes: text("notes"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("health_member_idx").on(table.householdId, table.memberId)],
);

export const educationRecords = familySchema.table(
  "education_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    school: text("school").notNull(),
    level: educationLevelEnum("level").notNull().default("sd"),
    academicYear: text("academic_year").notNull(),
    annualCost: numeric("annual_cost", { precision: 18, scale: 2 }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("education_member_idx").on(table.householdId, table.memberId)],
);

export const shoppingItems = familySchema.table(
  "shopping_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    qty: integer("qty").notNull().default(1),
    unit: text("unit").notNull().default("pcs"),
    estimatedPrice: numeric("estimated_price", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    actualPrice: numeric("actual_price", { precision: 18, scale: 2 }),
    checked: boolean("checked").notNull().default(false),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("shopping_household_idx").on(table.householdId)],
);

