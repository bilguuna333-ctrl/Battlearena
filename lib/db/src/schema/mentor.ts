import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const mentorGroupsTable = pgTable("mentor_groups", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  joinCode: text("join_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MentorGroup = typeof mentorGroupsTable.$inferSelect;

export const groupMembersTable = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull(),
    userId: integer("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("group_member_uniq").on(t.groupId, t.userId),
  }),
);

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  problemId: integer("problem_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Assignment = typeof assignmentsTable.$inferSelect;

export const assignmentSubmissionsTable = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull().default("javascript"),
  status: text("status").notNull().default("submitted"),
  reviewerNote: text("reviewer_note"),
  reviewerScore: integer("reviewer_score"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
