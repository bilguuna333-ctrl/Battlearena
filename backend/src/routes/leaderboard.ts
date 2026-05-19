import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { rankFromElo } from "../lib/elo";

const router: IRouter = Router();

router.get("/api/leaderboard", async (req, res): Promise<void> => {
  const scope = String(req.query.scope ?? "global");
  // sort=elo  -> rank by battle ELO (default, original behaviour)
  // sort=xp   -> rank by total XP earned from solving problems
  const sort = String(req.query.sort ?? "elo") === "xp" ? "xp" : "elo";
  const limit = Math.min(Number(req.query.limit ?? 100), 200);
  const orderCol =
    sort === "xp" ? usersTable.xp : usersTable.eloRating;
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(desc(orderCol))
    .limit(limit);
  const items = rows.map((u, idx) => {
    const totalBattles = u.battleWins + u.battleLosses + u.battleDraws;
    const winRate = totalBattles === 0 ? 0 : u.battleWins / totalBattles;
    return {
      position: idx + 1,
      username: u.username,
      displayName: u.displayName,
      avatarSeed: u.avatarSeed,
      avatarUrl: u.avatarUrl,
      eloRating: u.eloRating,
      xp: u.xp,
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
