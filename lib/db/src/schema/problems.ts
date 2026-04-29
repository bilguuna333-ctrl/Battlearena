import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export type ProblemExample = {
  input: string;
  output: string;
  explanation?: string | null;
};

export type ProblemTestCase = {
  input: string;
  expectedOutput: string;
};

export type ProblemStarter = {
  javascript: string;
  python: string;
};

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(),
  statement: text("statement").notNull(),
  inputDescription: text("input_description").notNull(),
  outputDescription: text("output_description").notNull(),
  constraints: text("constraints").notNull(),
  examples: jsonb("examples").$type<ProblemExample[]>().notNull(),
  publicTestCases: jsonb("public_test_cases")
    .$type<ProblemTestCase[]>()
    .notNull(),
  hiddenTestCases: jsonb("hidden_test_cases")
    .$type<ProblemTestCase[]>()
    .notNull(),
  tags: text("tags").array().notNull().default([]),
  starterCode: jsonb("starter_code").$type<ProblemStarter>().notNull(),
  xpReward: integer("xp_reward").notNull().default(50),
  eloReward: integer("elo_reward").notNull().default(0),
  timeLimit: integer("time_limit").notNull().default(2000),
  memoryLimit: integer("memory_limit").notNull().default(256),
  solvedCount: integer("solved_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Problem = typeof problemsTable.$inferSelect;
