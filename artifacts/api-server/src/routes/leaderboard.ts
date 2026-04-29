import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { rankFromElo } from "../lib/elo";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const scope = String(req.query.scope ?? "global");
  const limit = Math.min(Number(req.query.limit ?? 100), 200);
  // For all scopes we currently return ELO-ranked list.
  // Weekly/monthly/season filters could narrow by joinedAt — we keep them as cosmetic for now.
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.eloRating))
    .limit(limit);
  const items = rows.map((u, idx) => {
    const totalBattles = u.battleWins + u.battleLosses + u.battleDraws;
    const winRate = totalBattles === 0 ? 0 : u.battleWins / totalBattles;
    return {
      position: idx + 1,
      username: u.username,
      displayName: u.displayName,
      avatarSeed: u.avatarSeed,
      eloRating: u.eloRating,
      rank: rankFromElo(u.eloRating),
      battleWins: u.battleWins,
      battleLosses: u.battleLosses,
      winRate,
      winStreak: u.winStreak,
    };
  });
  void scope;
  res.json(items);
});

export default router;
