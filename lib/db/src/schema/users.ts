import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarSeed: text("avatar_seed"),
  bio: text("bio"),
  favoriteLanguage: text("favorite_language"),
  language: text("language").notNull().default("mn"),
  eloRating: integer("elo_rating").notNull().default(1000),
  highestElo: integer("highest_elo").notNull().default(1000),
  xp: integer("xp").notNull().default(0),
  coins: integer("coins").notNull().default(100),
  battleWins: integer("battle_wins").notNull().default(0),
  battleLosses: integer("battle_losses").notNull().default(0),
  battleDraws: integer("battle_draws").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  highestRank: text("highest_rank").notNull().default("Шинэхэн"),
  title: text("title"),
  isBot: integer("is_bot").notNull().default(0),
  isCompany: integer("is_company").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
