import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const hiringChallengesTable = pgTable("hiring_challenges", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  problemIds: jsonb("problem_ids").notNull().default([]),
  positions: integer("positions").notNull().default(1),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type HiringChallenge = typeof hiringChallengesTable.$inferSelect;

export const challengeApplicationsTable = pgTable(
  "challenge_applications",
  {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id").notNull(),
    userId: integer("user_id").notNull(),
    score: integer("score").notNull().default(0),
    solvedCount: integer("solved_count").notNull().default(0),
    status: text("status").notNull().default("applied"),
    recruiterNote: text("recruiter_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("challenge_app_uniq").on(t.challengeId, t.userId),
  }),
);

export type ChallengeApplication =
  typeof challengeApplicationsTable.$inferSelect;
