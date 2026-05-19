import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  bossesTable,
  bossFightsTable,
  problemsTable,
  usersTable,
} from "@workspace/db";
import { z } from "zod";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { runTests } from "../lib/runner";
import { applyMissionEvent } from "../lib/missions-engine";
import { pushActivity, pushNotification } from "../lib/activity";

const router: IRouter = Router();

const AttackInput = z.object({
  language: z.enum(["javascript", "python"]),
  code: z.string().min(1),
});

async function buildFightState(fight: typeof bossFightsTable.$inferSelect) {
  const [boss] = await db
    .select()
    .from(bossesTable)
    .where(eq(bossesTable.id, fight.bossId));
  if (!boss) return null;
  const problemIds = Array.isArray(boss.problemIds) ? (boss.problemIds as number[]) : [];
  const total = problemIds.length;
  let currentProblem = null;
  if (
    fight.state === "active" &&
    fight.currentProblemIdx >= 0 &&
    fight.currentProblemIdx < total
  ) {
    const pid = problemIds[fight.currentProblemIdx];
    const [p] = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.id, pid));
    if (p) {
      currentProblem = {
        id: p.id,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        statement: p.statement,
        inputDescription: p.inputDescription,
        outputDescription: p.outputDescription,
        constraints: p.constraints,
        examples: p.examples,
        publicTestCases: p.publicTestCases,
        tags: p.tags,
        xpReward: p.xpReward,
        eloReward: p.eloReward,
        timeLimit: p.timeLimit,
        memoryLimit: p.memoryLimit,
        starterCode: p.starterCode,
      };
    }
  }
  return {
    id: fight.id,
    bossId: boss.id,
    bossSlug: boss.slug,
    bossName: boss.name,
    title: boss.title,
    artColor: boss.artColor,
    icon: boss.icon,
    maxHp: boss.maxHp,
    bossHp: fight.bossHp,
    playerHp: fight.playerHp,
    combo: fight.combo,
    state: fight.state,
    currentProblem,
    currentProblemIdx: fight.currentProblemIdx,
    totalProblems: total,
    result: fight.result,
    rewardXp: fight.state === "victory" ? boss.rewardXp : null,
    rewardCoins: fight.state === "victory" ? boss.rewardCoins : null,
    rewardTitle: fight.state === "victory" ? boss.rewardTitle : null,
  };
}

router.get(
  "/api/bosses",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const bosses = await db.select().from(bossesTable);
    const myWins = await db
      .select()
      .from(bossFightsTable)
      .where(
        and(
          eq(bossFightsTable.userId, req.user.id),
          eq(bossFightsTable.state, "victory"),
        ),
      );
    const wonBossIds = new Set(myWins.map((f) => f.bossId));
    res.json(
      bosses.map((b) => {
        const arr = Array.isArray(b.problemIds) ? (b.problemIds as number[]) : [];
        return {
          id: b.id,
          slug: b.slug,
          name: b.name,
          title: b.title,
          description: b.description,
          difficulty: b.difficulty,
          maxHp: b.maxHp,
          rewardXp: b.rewardXp,
          rewardCoins: b.rewardCoins,
          rewardTitle: b.rewardTitle,
          problemCount: arr.length,
          artColor: b.artColor,
          icon: b.icon,
          defeated: wonBossIds.has(b.id),
        };
      }),
    );
  },
);

router.get(
  "/api/bosses/:slug",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const slug = String(req.params.slug);
    const [b] = await db
      .select()
      .from(bossesTable)
      .where(eq(bossesTable.slug, slug));
    if (!b) {
      res.status(404).json({ error: "Бөх олдсонгүй" });
      return;
    }
    const ids = Array.isArray(b.problemIds) ? (b.problemIds as number[]) : [];
    const problems = ids.length
      ? await db
          .select()
          .from(problemsTable)
          .where(inArray(problemsTable.id, ids))
      : [];
    const myWin = await db
      .select()
      .from(bossFightsTable)
      .where(
        and(
          eq(bossFightsTable.userId, req.user.id),
          eq(bossFightsTable.bossId, b.id),
          eq(bossFightsTable.state, "victory"),
        ),
      );
    res.json({
      id: b.id,
      slug: b.slug,
      name: b.name,
      title: b.title,
      description: b.description,
      difficulty: b.difficulty,
      maxHp: b.maxHp,
      rewardXp: b.rewardXp,
      rewardCoins: b.rewardCoins,
      rewardTitle: b.rewardTitle,
      problems: problems.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags,
        xpReward: p.xpReward,
        eloReward: p.eloReward,
        solvedCount: p.solvedCount,
      })),
      artColor: b.artColor,
      icon: b.icon,
      defeated: myWin.length > 0,
    });
  },
);

router.post(
  "/api/bosses/:slug/start",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const slug = String(req.params.slug);
    const [b] = await db
      .select()
      .from(bossesTable)
      .where(eq(bossesTable.slug, slug));
    if (!b) {
      res.status(404).json({ error: "Бөх олдсонгүй" });
      return;
    }
    // End any existing active fight (forfeit it)
    await db
      .update(bossFightsTable)
      .set({ state: "defeat", result: "abandoned", finishedAt: new Date() })
      .where(
        and(
          eq(bossFightsTable.userId, req.user.id),
          eq(bossFightsTable.state, "active"),
        ),
      );
    const [created] = await db
      .insert(bossFightsTable)
      .values({
        userId: req.user.id,
        bossId: b.id,
        bossHp: b.maxHp,
        playerHp: 100,
        combo: 0,
        state: "active",
        currentProblemIdx: 0,
      })
      .returning();
    const state = await buildFightState(created);
    res.json(state);
  },
);

router.get(
  "/api/boss-fights/active",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const [active] = await db
      .select()
      .from(bossFightsTable)
      .where(
        and(
          eq(bossFightsTable.userId, req.user.id),
          eq(bossFightsTable.state, "active"),
        ),
      )
      .orderBy(desc(bossFightsTable.startedAt))
      .limit(1);
    if (!active) {
      res.status(404).json({ error: "Идэвхгүй" });
      return;
    }
    const state = await buildFightState(active);
    res.json(state);
  },
);

router.post(
  "/api/boss-fights/:id/attack",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const parsed = AttackInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const [fight] = await db
      .select()
      .from(bossFightsTable)
      .where(eq(bossFightsTable.id, id));
    if (!fight || fight.userId !== req.user.id) {
      res.status(404).json({ error: "Тулаан олдсонгүй" });
      return;
    }
    if (fight.state !== "active") {
      res.status(400).json({ error: "Тулаан дууссан" });
      return;
    }
    const [boss] = await db
      .select()
      .from(bossesTable)
      .where(eq(bossesTable.id, fight.bossId));
    if (!boss) {
      res.status(404).json({ error: "Бөх олдсонгүй" });
      return;
    }
    const problemIds = Array.isArray(boss.problemIds) ? (boss.problemIds as number[]) : [];
    const pid = problemIds[fight.currentProblemIdx];
    const [problem] = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.id, pid));
    if (!problem) {
      res.status(404).json({ error: "Дасгал олдсонгүй" });
      return;
    }
    const allCases = [...problem.publicTestCases, ...problem.hiddenTestCases];
    const result = runTests(parsed.data.language, parsed.data.code, allCases);

    const passed = result.status === "accepted";
    let damage = 0;
    let playerDamage = 0;
    let combo = fight.combo;
    let comboMult = 1;
    let bossHp = fight.bossHp;
    let playerHp = fight.playerHp;
    let nextIdx = fight.currentProblemIdx;

    if (passed) {
      combo = combo + 1;
      comboMult = 1 + Math.min(combo - 1, 4) * 0.25;
      const baseDamage = Math.ceil(boss.maxHp / problemIds.length);
      damage = Math.round(baseDamage * comboMult);
      bossHp = Math.max(0, bossHp - damage);
      nextIdx = fight.currentProblemIdx + 1;
    } else {
      combo = 0;
      const ratio = result.totalCount > 0 ? result.passedCount / result.totalCount : 0;
      // Max 35 damage to player; partial credit reduces it
      playerDamage = Math.max(10, Math.round(35 * (1 - ratio)));
      playerHp = Math.max(0, playerHp - playerDamage);
    }

    let state: "active" | "victory" | "defeat" = "active";
    let resultStr: string | null = null;
    if (bossHp <= 0 || nextIdx >= problemIds.length) {
      state = "victory";
      resultStr = "victory";
    } else if (playerHp <= 0) {
      state = "defeat";
      resultStr = "defeat";
    }

    await db
      .update(bossFightsTable)
      .set({
        bossHp,
        playerHp,
        combo,
        currentProblemIdx: nextIdx,
        state,
        result: resultStr,
        finishedAt: state !== "active" ? new Date() : null,
      })
      .where(eq(bossFightsTable.id, fight.id));

    if (state === "victory") {
      const newXp = req.user.xp + boss.rewardXp;
      const newCoins = req.user.coins + boss.rewardCoins;
      await db
        .update(usersTable)
        .set({
          xp: newXp,
          coins: newCoins,
          title: boss.rewardTitle ?? req.user.title,
        })
        .where(eq(usersTable.id, req.user.id));
      await applyMissionEvent({ userId: req.user.id, type: "boss_defeated" });
      await pushActivity(req.user.id, "boss_defeated", {
        bossSlug: boss.slug,
        bossName: boss.name,
      });
      await pushNotification(
        req.user.id,
        "boss_victory",
        `${boss.name}-ийг ялагдууллаа! +${boss.rewardXp} XP`,
        boss.rewardTitle ?? null,
        `/bosses/${boss.slug}`,
      );
    }

    const updated = await db
      .select()
      .from(bossFightsTable)
      .where(eq(bossFightsTable.id, fight.id));
    const fightState = await buildFightState(updated[0]);
    res.json({
      passed,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      damageDealt: damage,
      playerDamage,
      comboMultiplier: comboMult,
      message: result.message,
      fight: fightState,
    });
  },
);

router.post(
  "/api/boss-fights/:id/forfeit",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const [fight] = await db
      .select()
      .from(bossFightsTable)
      .where(eq(bossFightsTable.id, id));
    if (!fight || fight.userId !== req.user.id) {
      res.status(404).json({ error: "Тулаан олдсонгүй" });
      return;
    }
    await db
      .update(bossFightsTable)
      .set({ state: "defeat", result: "abandoned", finishedAt: new Date() })
      .where(eq(bossFightsTable.id, fight.id));
    res.json({ ok: true });
  },
);

export default router;
