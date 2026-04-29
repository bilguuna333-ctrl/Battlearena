import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const bossesTable = pgTable("bosses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  title: text("title").notNull(),
  titleEn: text("title_en").notNull(),
  description: text("description").notNull(),
  descriptionEn: text("description_en").notNull(),
  difficulty: text("difficulty").notNull(),
  maxHp: integer("max_hp").notNull(),
  problemIds: jsonb("problem_ids").notNull().default([]),
  rewardXp: integer("reward_xp").notNull().default(0),
  rewardCoins: integer("reward_coins").notNull().default(0),
  rewardTitle: text("reward_title"),
  artColor: text("art_color").notNull().default("purple"),
  icon: text("icon").notNull().default("flame"),
});

export type Boss = typeof bossesTable.$inferSelect;

export const bossFightsTable = pgTable("boss_fights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bossId: integer("boss_id").notNull(),
  bossHp: integer("boss_hp").notNull(),
  playerHp: integer("player_hp").notNull().default(100),
  combo: integer("combo").notNull().default(0),
  state: text("state").notNull().default("active"),
  result: text("result"),
  currentProblemIdx: integer("current_problem_idx").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type BossFight = typeof bossFightsTable.$inferSelect;
