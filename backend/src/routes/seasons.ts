import { Router, type IRouter } from "express";
import { desc, eq, lte, gte, and } from "drizzle-orm";
import { db, seasonsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

async function withChampion(season: typeof seasonsTable.$inferSelect) {
  let champion = null;
  if (season.champion_user_id) {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, season.champion_user_id));
    if (u) {
      champion = {
        username: u.username,
        displayName: u.displayName,
        eloRating: u.eloRating,
      };
    }
  }
  return {
    id: season.id,
    name: season.name,
    startedAt: season.startedAt.toISOString(),
    endsAt: season.endsAt.toISOString(),
    isActive:
      new Date(season.startedAt).getTime() <= Date.now() &&
      new Date(season.endsAt).getTime() > Date.now(),
    champion,
  };
}

router.get("/api/seasons/current", async (_req, res): Promise<void> => {
  const now = new Date();
  const [season] = await db
    .select()
    .from(seasonsTable)
    .where(
      and(lte(seasonsTable.startedAt, now), gte(seasonsTable.endsAt, now)),
    )
    .limit(1);
  if (!season) {
    res.status(404).json({ error: "Идэвхтэй улирал байхгүй" });
    return;
  }
  const [topPlayer] = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.eloRating))
    .limit(1);
  const data = await withChampion(season);
  res.json({
    ...data,
    topPlayer: topPlayer
      ? {
          username: topPlayer.username,
          displayName: topPlayer.displayName,
          eloRating: topPlayer.eloRating,
        }
      : null,
  });
});

router.get("/api/seasons", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(seasonsTable)
    .orderBy(desc(seasonsTable.startedAt));
  const items = await Promise.all(rows.map(withChampion));
  res.json(items);
});

export default router;
