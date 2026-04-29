import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const seasonsTable = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  champion_user_id: integer("champion_user_id"),
});

export type Season = typeof seasonsTable.$inferSelect;
