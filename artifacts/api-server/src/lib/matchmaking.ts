import crypto from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  db,
  matchQueueTable,
  usersTable,
  problemsTable,
  battlesTable,
} from "@workspace/db";

const ACCEPT_WINDOW_SECONDS = 15;

export async function tryFindMatch(
  userId: number,
): Promise<{ matchId: string; opponentUserId: number } | null> {
  const [me] = await db
    .select()
    .from(matchQueueTable)
    .where(eq(matchQueueTable.userId, userId));
  if (!me || me.state !== "searching") return null;

  const elapsedSec = Math.floor(
    (Date.now() - new Date(me.joinedAt).getTime()) / 1000,
  );
  // ELO range expands over time: 50 base + 25 per second, capped at 800
  const range = Math.min(50 + elapsedSec * 25, 800);
  const lower = me.eloAtJoin - range;
  const upper = me.eloAtJoin + range;

  const candidates = await db
    .select({
      id: matchQueueTable.id,
      userId: matchQueueTable.userId,
      eloAtJoin: matchQueueTable.eloAtJoin,
      state: matchQueueTable.state,
      joinedAt: matchQueueTable.joinedAt,
      mode: matchQueueTable.mode,
    })
    .from(matchQueueTable)
    .where(
      and(
        eq(matchQueueTable.state, "searching"),
        ne(matchQueueTable.userId, userId),
        eq(matchQueueTable.mode, me.mode),
        sql`${matchQueueTable.eloAtJoin} BETWEEN ${lower} AND ${upper}`,
      ),
    );

  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) =>
    Math.abs(a.eloAtJoin - me.eloAtJoin) <
    Math.abs(b.eloAtJoin - me.eloAtJoin)
      ? a
      : b,
  );

  const matchId = crypto.randomUUID();
  const acceptDeadline = new Date(Date.now() + ACCEPT_WINDOW_SECONDS * 1000);

  await db
    .update(matchQueueTable)
    .set({
      state: "match_found",
      matchId,
      opponentUserId: best.userId,
      acceptDeadline,
    })
    .where(eq(matchQueueTable.userId, userId));

  await db
    .update(matchQueueTable)
    .set({
      state: "match_found",
      matchId,
      opponentUserId: userId,
      acceptDeadline,
    })
    .where(eq(matchQueueTable.userId, best.userId));

  return { matchId, opponentUserId: best.userId };
}

export async function expireStaleMatches(): Promise<void> {
  // If a match_found has expired without both accepting, return both to searching.
  const stale = await db
    .select()
    .from(matchQueueTable)
    .where(eq(matchQueueTable.state, "match_found"));

  const now = Date.now();
  for (const row of stale) {
    if (row.acceptDeadline && new Date(row.acceptDeadline).getTime() < now) {
      await db
        .update(matchQueueTable)
        .set({
          state: "searching",
          matchId: null,
          opponentUserId: null,
          acceptDeadline: null,
          acceptedAt: null,
          joinedAt: new Date(),
        })
        .where(eq(matchQueueTable.userId, row.userId));
    }
  }
}

async function pickRandomProblem(): Promise<number | null> {
  const [row] = await db
    .select({ id: problemsTable.id })
    .from(problemsTable)
    .orderBy(sql`RANDOM()`)
    .limit(1);
  return row?.id ?? null;
}

export async function tryStartBattleIfBothAccepted(
  matchId: string,
): Promise<string | null> {
  const both = await db
    .select()
    .from(matchQueueTable)
    .where(eq(matchQueueTable.matchId, matchId));
  if (both.length !== 2) return null;
  if (!both.every((r) => r.state === "accepted")) return null;

  // If a battle is already linked, return it.
  const existing = both.find((r) => r.pendingBattleId);
  if (existing?.pendingBattleId) {
    return existing.pendingBattleId;
  }

  const [u1, u2] = both;
  const [user1] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, u1.userId));
  const [user2] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, u2.userId));
  if (!user1 || !user2) return null;

  const problemId = await pickRandomProblem();
  if (!problemId) return null;

  const battleId = crypto.randomUUID();
  const battleMode = u1.mode ?? "ranked";
  await db.insert(battlesTable).values({
    id: battleId,
    problemId,
    player1Id: user1.id,
    player2Id: user2.id,
    state: "in_battle",
    mode: battleMode,
    player1EloBefore: user1.eloRating,
    player2EloBefore: user2.eloRating,
    startedAt: new Date(),
  });
  // Initialize replay
  const { ensureReplay } = await import("./replays");
  await ensureReplay(battleId, problemId, user1.id, user2.id);

  await db
    .update(matchQueueTable)
    .set({ state: "in_battle", pendingBattleId: battleId })
    .where(eq(matchQueueTable.matchId, matchId));

  return battleId;
}
