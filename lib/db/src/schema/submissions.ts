import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  problemId: integer("problem_id").notNull(),
  battleId: text("battle_id"),
  language: text("language").notNull(),
  code: text("code").notNull(),
  status: text("status").notNull(),
  passedCount: integer("passed_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  runtimeMs: integer("runtime_ms").notNull().default(0),
  message: text("message").notNull().default(""),
  results: jsonb("results").$type<unknown>(),
  codeHash: text("code_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Submission = typeof submissionsTable.$inferSelect;
