import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const missionsTable = pgTable("missions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  titleEn: text("title_en").notNull(),
  description: text("description").notNull(),
  descriptionEn: text("description_en").notNull(),
  period: text("period").notNull(),
  goalType: text("goal_type").notNull(),
  goalParams: text("goal_params"),
  goalCount: integer("goal_count").notNull().default(1),
  rewardXp: integer("reward_xp").notNull().default(0),
  rewardCoins: integer("reward_coins").notNull().default(0),
  rewardBadge: text("reward_badge"),
  icon: text("icon").notNull().default("target"),
});

export type Mission = typeof missionsTable.$inferSelect;

export const userMissionsTable = pgTable(
  "user_missions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    missionId: integer("mission_id").notNull(),
    periodKey: text("period_key").notNull(),
    progress: integer("progress").notNull().default(0),
    claimed: integer("claimed").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("user_mission_period_uniq").on(
      t.userId,
      t.missionId,
      t.periodKey,
    ),
  }),
);

export type UserMission = typeof userMissionsTable.$inferSelect;
