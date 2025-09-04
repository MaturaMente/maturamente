import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  primaryKey,
  uuid,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const waitList = pgTable("waiting_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  unsubscribed: boolean("unsubscribed").default(false),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  stripe_customer_id: text("stripe_customer_id").unique(),
  stripe_subscription_id: text("stripe_subscription_id").unique(),
  stripe_price_id: text("stripe_price_id"), // Primary price ID (for custom plans)
  status: text("status").notNull(), // active, canceled, past_due, etc.
  subject_count: integer("subject_count").notNull(), // Number of subjects in the subscription
  custom_price: decimal("custom_price", { precision: 10, scale: 2 }).notNull(), // Total price for the subscription
  monthly_ai_budget: decimal("monthly_ai_budget", { precision: 10, scale: 4 }).notNull().default("0"), // Monthly AI budget in EUR (custom_price * 0.25)
  is_free_trial: boolean("is_free_trial").notNull().default(false),
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Table to track pending subscription changes (downgrades, scheduled upgrades)
export const pendingSubscriptionChanges = pgTable(
  "pending_subscription_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id")
      .references(() => users.id)
      .notNull(),
    subscription_id: uuid("subscription_id")
      .references(() => subscriptions.id)
      .notNull(),
    change_type: text("change_type").notNull(), // 'upgrade', 'downgrade', 'cancel'
    timing: text("timing").notNull(), // 'immediate', 'next_period'
    new_subject_ids: jsonb("new_subject_ids"), // Array of subject IDs for the new plan
    new_subject_count: integer("new_subject_count"), // Number of subjects in new plan
    new_price: decimal("new_price", { precision: 10, scale: 2 }), // New price for the plan
    scheduled_date: timestamp("scheduled_date"), // When the change should take effect
    status: text("status").notNull().default("pending"), // 'pending', 'applied', 'cancelled', 'failed'
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username"),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ]
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ]
);

export const topicsTable = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  order_index: integer("order_index"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  subject_id: uuid("subject_id")
    .references(() => subjectsTable.id)
    .default("db1dbaad-2960-4b9d-a83c-cf4563c15241"),
  slug: text("slug").notNull(),
});

export const subtopicsTable = pgTable("subtopics", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic_id: uuid("topic_id")
    .references(() => topicsTable.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  order_index: integer("order_index"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  slug: text("slug").notNull(),
});

export const completedTopicsTable = pgTable("completed_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  topic_id: uuid("topic_id").references(() => topicsTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const completedSubtopicsTable = pgTable("completed_subtopics", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  subtopic_id: uuid("subtopic_id").references(() => subtopicsTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const exercisesTable = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  question_data: jsonb("question_data").notNull(),
  solution_data: jsonb("solution_data").notNull(),
  exercise_card_id: uuid("exercise_card_id")
    .references(() => exercisesCardsTable.id)
    .notNull(),
  order_index: integer("order_index"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const exercisesCardsTable = pgTable("exercises_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  subtopic_id: uuid("subtopic_id").references(() => subtopicsTable.id),
  description: text("description").notNull(),
  difficulty: integer("difficulty").notNull(), // either 1, 2, 3
  order_index: integer("order_index"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  slug: text("slug").notNull(),
});

export const completedExercisesTable = pgTable("completed_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  exercise_id: uuid("exercise_id").references(() => exercisesTable.id),
  is_correct: boolean("is_correct").notNull(),
  attempt: integer("attempt").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const completedExercisesCardsTable = pgTable(
  "completed_exercises_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id").references(() => users.id),
    exercise_card_id: uuid("exercise_card_id").references(
      () => exercisesCardsTable.id
    ),
    created_at: timestamp("created_at").notNull().defaultNow(),
  }
);

export const flaggedExercisesTable = pgTable("flagged_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  exercise_id: uuid("exercise_id").references(() => exercisesTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const flaggedExercisesCardsTable = pgTable("flagged_exercises_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  exercise_card_id: uuid("exercise_card_id").references(
    () => exercisesCardsTable.id
  ),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const theoryTable = pgTable("theory", {
  id: uuid("id").primaryKey().defaultRandom(),
  subtopic_id: uuid("subtopic_id").references(() => subtopicsTable.id),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const simulationsCardsTable = pgTable("simulations_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  year: integer("year").notNull(),
  subject_id: uuid("subject_id")
    .references(() => subjectsTable.id)
    .default("db1dbaad-2960-4b9d-a83c-cf4563c15241"),
  order_index: integer("order_index"),
  slug: text("slug").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const simulationsTable = pgTable("simulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  card_id: uuid("card_id")
    .notNull()
    .references(() => simulationsCardsTable.id),
  pdf_url: text("pdf_url").notNull(),
  time_in_min: integer("time_in_min").notNull(),
  is_complete: boolean("is_complete").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  slug: text("slug").notNull(),
});

export const simulationsSolutionsTable = pgTable("simulations_solutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  pdf_url: text("pdf_url").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const relationSimulationSolutionTable = pgTable(
  "relation_simulations_solutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    simulation_id: uuid("simulation_id").references(() => simulationsTable.id),
    solution_id: uuid("solution_id").references(
      () => simulationsSolutionsTable.id
    ),
    order_index: integer("order_index").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
  }
);

export const completedSimulationsTable = pgTable("completed_simulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  simulation_id: uuid("simulation_id").references(() => simulationsTable.id),
  attempt: integer("attempt").notNull(),
  started_at: timestamp("started_at").notNull().defaultNow(),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const flaggedSimulationsTable = pgTable("flagged_simulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  simulation_id: uuid("simulation_id").references(() => simulationsTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const subjectsTable = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  order_index: integer("order_index").notNull().default(1),
  color: text("color").notNull().default("#000000"),
  maturita: boolean("maturita").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  slug: text("slug").notNull().unique(),
});

export const relationSubjectsUserTable = pgTable("relation_subjects_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  subject_id: uuid("subject_id").references(() => subjectsTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const notesTable = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  storage_path: text("storage_path").notNull(),
  subject_id: uuid("subject_id").references(() => subjectsTable.id),
  n_pages: integer("n_pages").notNull().default(1),
  slug: text("slug").notNull(),
  free_trial: boolean("free_trial").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const flaggedNotesTable = pgTable("flagged_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  note_id: uuid("note_id").references(() => notesTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const noteStudySessionsTable = pgTable("note_study_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  note_id: uuid("note_id")
    .notNull()
    .references(() => notesTable.id),
  started_at: timestamp("started_at").notNull().defaultNow(),
  last_active_at: timestamp("last_active_at").notNull().defaultNow(),
});

export const uploadedFilesTable = pgTable("uploaded_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  file_name: text("file_name").notNull(), // Original filename for display
  pinecone_source: text("pinecone_source").notNull(), // Unique filename used in Pinecone (for filtering)
  file_type: text("file_type").notNull(), // pdf, docx, txt
  title: text("title").notNull(), // Generated by LLM
  description: text("description").notNull(), // Generated by LLM  
  n_pages: integer("n_pages").notNull().default(1), // For PDFs, or estimated pages for other formats
  storage_path: text("storage_path"), // Optional: if we store files in cloud storage
  upload_timestamp: timestamp("upload_timestamp").notNull().defaultNow(),
  processing_status: text("processing_status").notNull().default("pending"), // pending, processing, completed, failed
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// AI Budget and Usage Tracking Tables
export const aiUsageTable = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscription_id: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  input_tokens: integer("input_tokens").notNull().default(0),
  output_tokens: integer("output_tokens").notNull().default(0),
  total_tokens: integer("total_tokens").notNull().default(0),
  input_cost_usd: decimal("input_cost_usd", { precision: 10, scale: 8 }).notNull().default("0"), // Cost in USD for input tokens
  output_cost_usd: decimal("output_cost_usd", { precision: 10, scale: 8 }).notNull().default("0"), // Cost in USD for output tokens
  total_cost_usd: decimal("total_cost_usd", { precision: 10, scale: 8 }).notNull().default("0"), // Total cost in USD
  chat_type: text("chat_type").notNull(), // 'pdf', 'subject', 'dashboard'
  model_used: text("model_used").notNull().default("deepseek-chat"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const aiBudgetBalanceTable = pgTable("ai_budget_balance", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscription_id: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  period_start: timestamp("period_start").notNull(),
  period_end: timestamp("period_end").notNull(),
  allocated_budget_eur: decimal("allocated_budget_eur", { precision: 10, scale: 4 }).notNull(), // Monthly budget in EUR
  used_budget_usd: decimal("used_budget_usd", { precision: 10, scale: 8 }).notNull().default("0"), // Used budget in USD
  remaining_budget_eur: decimal("remaining_budget_eur", { precision: 10, scale: 4 }).notNull(), // Remaining budget in EUR
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
