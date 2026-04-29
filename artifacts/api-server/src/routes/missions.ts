import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  missionsTable,
  userMissionsTable,
  usersTable,
} from "@workspace/db";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { periodKey } from "../lib/periods";
import { pushNotification } from "../lib/activity";

const router: IRouter = Router();

router.get(
  "/missions",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const lang = req.user.language ?? "mn";
    const missions = await db.select().from(missionsTable);
    const result = [];
    for (const m of missions) {
      const key = periodKey(m.period);
      const [um] = await db
        .select()
        .from(userMissionsTable)
        .where(
          and(
            eq(userMissionsTable.userId, req.user.id),
            eq(userMissionsTable.missionId, m.id),
            eq(userMissionsTable.periodKey, key),
          ),
        );
      const progress = um?.progress ?? 0;
      const claimed = (um?.claimed ?? 0) === 1;
      result.push({
        id: m.id,
        slug: m.slug,
        title: lang === "en" ? m.titleEn : m.title,
        description: lang === "en" ? m.descriptionEn : m.description,
        period: m.period,
        goalCount: m.goalCount,
        progress,
        claimed,
        rewardXp: m.rewardXp,
        rewardCoins: m.rewardCoins,
        rewardBadge: m.rewardBadge,
        icon: m.icon,
        periodKey: key,
        percent: Math.min(1, progress / m.goalCount),
      });
    }
    result.sort((a, b) => {
      if (a.period !== b.period) return a.period === "daily" ? -1 : 1;
      if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
      return b.percent - a.percent;
    });
    res.json(result);
  },
);

router.post(
  "/missions/:id/claim",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const [m] = await db
      .select()
      .from(missionsTable)
      .where(eq(missionsTable.id, id));
    if (!m) {
      res.status(404).json({ error: "Даалгавар олдсонгүй" });
      return;
    }
    const key = periodKey(m.period);
    const [um] = await db
      .select()
      .from(userMissionsTable)
      .where(
        and(
          eq(userMissionsTable.userId, req.user.id),
          eq(userMissionsTable.missionId, m.id),
          eq(userMissionsTable.periodKey, key),
        ),
      );
    if (!um || um.progress < m.goalCount) {
      res.status(400).json({ error: "Дуусаагүй байна" });
      return;
    }
    if (um.claimed === 1) {
      res.status(400).json({ error: "Аль хэдийн авсан" });
      return;
    }
    await db
      .update(userMissionsTable)
      .set({ claimed: 1, updatedAt: new Date() })
      .where(eq(userMissionsTable.id, um.id));
    const newXp = req.user.xp + m.rewardXp;
    const newCoins = req.user.coins + m.rewardCoins;
    await db
      .update(usersTable)
      .set({ xp: newXp, coins: newCoins })
      .where(eq(usersTable.id, req.user.id));
    await pushNotification(
      req.user.id,
      "mission_claimed",
      `+${m.rewardXp} XP, +${m.rewardCoins} зоос`,
      m.title,
      "/missions",
    );
    res.json({
      ok: true,
      xpGained: m.rewardXp,
      coinsGained: m.rewardCoins,
      badge: m.rewardBadge,
      totalXp: newXp,
      totalCoins: newCoins,
    });
  },
);

export default router;
