import { Router, type IRouter } from "express";
import { and, desc, eq, or } from "drizzle-orm";
import {
  db,
  usersTable,
  battlesTable,
  problemsTable,
  eloHistoryTable,
} from "@workspace/db";
import { rankFromElo } from "../lib/elo";

const router: IRouter = Router();

function badgesForUser(u: typeof usersTable.$inferSelect) {
  const badges: { id: string; name: string; description: string; icon: string }[] = [];
  if (u.battleWins >= 1) badges.push({ id: "first_win", name: "Анхны ялалт", description: "Анхны тулаандаа ялсан", icon: "trophy" });
  if (u.battleWins >= 10) badges.push({ id: "ten_wins", name: "10 ялалт", description: "10 тулаанд ялсан", icon: "swords" });
  if (u.winStreak >= 5) badges.push({ id: "streak_5", name: "5 цуврал ялалт", description: "Дараалан 5 ялсан", icon: "flame" });
  if (u.eloRating >= 2100) badges.push({ id: "legend", name: "Домог", description: "Домог чансаанд хүрсэн", icon: "crown" });
  if (u.highestElo >= 1800) badges.push({ id: "master", name: "Мастер", description: "Мастер чансаанд хүрсэн", icon: "shield" });
  return badges;
}

async function loadHistoryItems(userId: number, limit = 10) {
  const rows = await db
    .select({
      battle: battlesTable,
      problem: problemsTable,
    })
    .from(battlesTable)
    .innerJoin(problemsTable, eq(problemsTable.id, battlesTable.problemId))
    .where(
      and(
        eq(battlesTable.state, "finished"),
        or(
          eq(battlesTable.player1Id, userId),
          eq(battlesTable.player2Id, userId),
        ),
      ),
    )
    .orderBy(desc(battlesTable.finishedAt))
    .limit(limit);

  const opponentIds = Array.from(
    new Set(
      rows.map((r) =>
        r.battle.player1Id === userId ? r.battle.player2Id : r.battle.player1Id,
      ),
    ),
  );
  const opponents = opponentIds.length
    ? await db
        .select()
        .from(usersTable)
        .where(
          opponentIds.length === 1
            ? eq(usersTable.id, opponentIds[0])
            : or(...opponentIds.map((id) => eq(usersTable.id, id)))!,
        )
    : [];
  const oppMap = new Map(opponents.map((o) => [o.id, o]));

  return rows.map(({ battle, problem }) => {
    const isP1 = battle.player1Id === userId;
    const opp = oppMap.get(isP1 ? battle.player2Id : battle.player1Id);
    let result: "win" | "loss" | "draw" = "draw";
    if (battle.result === "draw") result = "draw";
    else if (battle.winnerId === userId) result = "win";
    else if (battle.winnerId !== null && battle.winnerId !== userId)
      result = "loss";
    const eloBefore = isP1 ? battle.player1EloBefore : battle.player2EloBefore;
    const eloAfter = isP1 ? battle.player1EloAfter : battle.player2EloAfter;
    const eloChange = (eloAfter ?? eloBefore) - eloBefore;
    return {
      battleId: battle.id,
      opponentUsername: opp?.username ?? "тоглогч",
      opponentDisplayName: opp?.displayName ?? "Тоглогч",
      opponentElo: opp?.eloRating ?? 1000,
      result,
      eloChange,
      eloAfter: eloAfter ?? eloBefore,
      problemTitle: problem.title,
      finishedAt: (battle.finishedAt ?? battle.startedAt).toISOString(),
    };
  });
}

router.get("/api/users/:username", async (req, res): Promise<void> => {
  const username = String(req.params.username).toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (!user) {
    res.status(404).json({ error: "Тоглогч олдсонгүй" });
    return;
  }
  const recentMatches = await loadHistoryItems(user.id, 10);
  const eloHistoryRows = await db
    .select()
    .from(eloHistoryTable)
    .where(eq(eloHistoryTable.userId, user.id))
    .orderBy(desc(eloHistoryTable.createdAt))
    .limit(50);
  const eloHistory = eloHistoryRows
    .reverse()
    .map((r) => ({
      elo: r.elo,
      change: r.change,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    }));
  const totalBattles = user.battleWins + user.battleLosses + user.battleDraws;
  const winRate = totalBattles === 0 ? 0 : user.battleWins / totalBattles;
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    eloRating: user.eloRating,
    highestElo: user.highestElo,
    xp: user.xp,
    battleWins: user.battleWins,
    battleLosses: user.battleLosses,
    battleDraws: user.battleDraws,
    winStreak: user.winStreak,
    rank: rankFromElo(user.eloRating),
    highestRank: user.highestRank,
    favoriteLanguage: user.favoriteLanguage,
    createdAt: user.createdAt.toISOString(),
    winRate,
    totalBattles,
    recentMatches,
    eloHistory,
    badges: badgesForUser(user),
  });
});

router.get("/api/users/:username/history", async (req, res): Promise<void> => {
  const username = String(req.params.username).toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (!user) {
    res.status(404).json({ error: "Тоглогч олдсонгүй" });
    return;
  }
  const items = await loadHistoryItems(user.id, 50);
  res.json(items);
});

router.get(
  "/users/:username/elo-history",
  async (req, res): Promise<void> => {
    const username = String(req.params.username).toLowerCase();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (!user) {
      res.status(404).json({ error: "Тоглогч олдсонгүй" });
      return;
    }
    const rows = await db
      .select()
      .from(eloHistoryTable)
      .where(eq(eloHistoryTable.userId, user.id))
      .orderBy(desc(eloHistoryTable.createdAt))
      .limit(100);
    res.json(
      rows.reverse().map((r) => ({
        elo: r.elo,
        change: r.change,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

export default router;
