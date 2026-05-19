import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

export const battlesTable = pgTable("battles", {
  id: text("id").primaryKey(),
  problemId: integer("problem_id").notNull(),
  player1Id: integer("player1_id").notNull(),
  player2Id: integer("player2_id").notNull(),
  mode: text("mode").notNull().default("ranked"),
  state: text("state").notNull().default("in_battle"),
  winnerId: integer("winner_id"),
  result: text("result"),
  player1EloBefore: integer("player1_elo_before").notNull(),
  player2EloBefore: integer("player2_elo_before").notNull(),
  player1EloAfter: integer("player1_elo_after"),
  player2EloAfter: integer("player2_elo_after"),
  player1Passed: integer("player1_passed").notNull().default(0),
  player2Passed: integer("player2_passed").notNull().default(0),
  player1FinishedAt: timestamp("player1_finished_at", { withTimezone: true }),
  player2FinishedAt: timestamp("player2_finished_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type Battle = typeof battlesTable.$inferSelect;

export const battleChatTable = pgTable("battle_chat", {
  id: serial("id").primaryKey(),
  battleId: text("battle_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eloHistoryTable = pgTable("elo_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  elo: integer("elo").notNull(),
  change: integer("change").notNull(),
  reason: text("reason").notNull(),
  battleId: text("battle_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EloHistoryEntry = typeof eloHistoryTable.$inferSelect;

export const matchQueueTable = pgTable("match_queue", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  eloAtJoin: integer("elo_at_join").notNull(),
  mode: text("mode").notNull().default("ranked"),
  state: text("state").notNull().default("searching"),
  matchId: text("match_id"),
  pendingBattleId: text("pending_battle_id"),
  opponentUserId: integer("opponent_user_id"),
  acceptDeadline: timestamp("accept_deadline", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export type MatchQueueEntry = typeof matchQueueTable.$inferSelect;

export const replaysTable = pgTable("replays", {
  battleId: text("battle_id").primaryKey(),
  problemId: integer("problem_id").notNull(),
  player1Id: integer("player1_id").notNull(),
  player2Id: integer("player2_id").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  events: jsonb("events").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Replay = typeof replaysTable.$inferSelect;

export const battleInvitationsTable = pgTable("battle_invitations", {
  id: text("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  mode: text("mode").notNull().default("ranked"),
  status: text("status").notNull().default("pending"),
  battleId: text("battle_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export type BattleInvitation = typeof battleInvitationsTable.$inferSelect;

export const lobbiesTable = pgTable("lobbies", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostUserId: integer("host_user_id").notNull(),
  mode: text("mode").notNull().default("normal"),
  maxPlayers: integer("max_players").notNull().default(2),
  problemId: integer("problem_id"),
  state: text("state").notNull().default("open"),
  battleId: text("battle_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type Lobby = typeof lobbiesTable.$inferSelect;

export const lobbyMembersTable = pgTable("lobby_members", {
  id: serial("id").primaryKey(),
  lobbyId: text("lobby_id").notNull(),
  userId: integer("user_id").notNull(),
  isHost: integer("is_host").notNull().default(0),
  ready: integer("ready").notNull().default(0),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LobbyMember = typeof lobbyMembersTable.$inferSelect;
