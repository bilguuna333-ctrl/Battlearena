import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  submissionsTable,
  problemsTable,
  battlesTable,
  eloHistoryTable,
} from "@workspace/db";
import { authMiddleware, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/analytics/me",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const userId = req.user.id;
    const submissions = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.userId, userId))
      .orderBy(desc(submissionsTable.createdAt))
      .limit(500);

    // Solve speed (battles only)
    const battles = await db
      .select()
      .from(battlesTable)
      .orderBy(desc(battlesTable.startedAt))
      .limit(200);
    const myBattles = battles.filter(
      (b) =>
        b.state === "finished" &&
        (b.player1Id === userId || b.player2Id === userId) &&
        b.winnerId === userId,
    );
    const speeds = myBattles
      .map((b) => {
        const finishedAt =
          b.player1Id === userId ? b.player1FinishedAt : b.player2FinishedAt;
        if (!finishedAt) return null;
        return (
          new Date(finishedAt).getTime() - new Date(b.startedAt).getTime()
        );
      })
      .filter((x): x is number => x !== null && x > 0);
    const avgSpeed = speeds.length
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
      : 0;
    const fastestSpeed = speeds.length ? Math.min(...speeds) : 0;

    // Accuracy
    const accepted = submissions.filter((s) => s.status === "accepted").length;
    const overallAcc = submissions.length > 0 ? accepted / submissions.length : 0;
    const last30 = submissions.slice(0, 30);
    const last30Acc =
      last30.length > 0
        ? last30.filter((s) => s.status === "accepted").length / last30.length
        : 0;

    // Language usage
    const langCounts = new Map<string, number>();
    for (const s of submissions) {
      langCounts.set(s.language, (langCounts.get(s.language) ?? 0) + 1);
    }
    const languageUsage = Array.from(langCounts.entries()).map(([language, count]) => ({
      language,
      count,
    }));

    // Difficulty + tag breakdown
    const probIds = Array.from(new Set(submissions.map((s) => s.problemId)));
    const problems = probIds.length
      ? await db.select().from(problemsTable).where(eq(problemsTable.id, probIds[0]))
      : [];
    // Fetch all problems we need
    const allProblems = await db.select().from(problemsTable);
    const probMap = new Map(allProblems.map((p) => [p.id, p]));

    const diffStats = new Map<string, { solved: Set<number>; attempted: Set<number> }>();
    const tagStats = new Map<
      string,
      { solved: number; attempted: number }
    >();
    for (const s of submissions) {
      const p = probMap.get(s.problemId);
      if (!p) continue;
      const ds = diffStats.get(p.difficulty) ?? {
        solved: new Set<number>(),
        attempted: new Set<number>(),
      };
      ds.attempted.add(p.id);
      if (s.status === "accepted") ds.solved.add(p.id);
      diffStats.set(p.difficulty, ds);
      for (const tag of p.tags) {
        const ts = tagStats.get(tag) ?? { solved: 0, attempted: 0 };
        ts.attempted += 1;
        if (s.status === "accepted") ts.solved += 1;
        tagStats.set(tag, ts);
      }
    }
    const difficultyBreakdown = Array.from(diffStats.entries()).map(([d, v]) => ({
      difficulty: d,
      solved: v.solved.size,
      attempted: v.attempted.size,
    }));
    const tagPerformance = Array.from(tagStats.entries())
      .map(([tag, v]) => ({
        tag,
        solved: v.solved,
        attempted: v.attempted,
        accuracy: v.attempted > 0 ? v.solved / v.attempted : 0,
      }))
      .sort((a, b) => b.attempted - a.attempted)
      .slice(0, 10);

    // Weekly activity
    const weekly: { date: string; count: number }[] = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      weekly.push({ date: dStr, count: 0 });
    }
    for (const s of submissions) {
      const dStr = new Date(s.createdAt).toISOString().slice(0, 10);
      const found = weekly.find((w) => w.date === dStr);
      if (found) found.count += 1;
    }

    // Recent ELO trend
    const eloRows = await db
      .select()
      .from(eloHistoryTable)
      .where(eq(eloHistoryTable.userId, userId))
      .orderBy(desc(eloHistoryTable.createdAt))
      .limit(20);
    const recentTrend = eloRows
      .reverse()
      .map((r) => ({
        date: r.createdAt.toISOString().slice(0, 10),
        elo: r.elo,
      }));

    // Skill radar - simple rule based using tag accuracy
    const skillTags = ["arrays", "math", "strings", "loops", "matrix", "conditionals"];
    const skillRadar = skillTags.map((tag) => {
      const ts = tagStats.get(tag);
      const value = ts && ts.attempted > 0 ? Math.round((ts.solved / ts.attempted) * 100) : 30;
      return { skill: tag, value };
    });

    // Recommendations - find weakest tags & suggest unsolved problems
    const solvedProblemIds = new Set(
      submissions.filter((s) => s.status === "accepted").map((s) => s.problemId),
    );
    const weakTags = tagPerformance
      .filter((t) => t.accuracy < 0.7 && t.attempted >= 1)
      .map((t) => t.tag)
      .slice(0, 3);
    const unsolved = allProblems.filter((p) => !solvedProblemIds.has(p.id));
    const recommendations = unsolved
      .filter((p) => weakTags.length === 0 || p.tags.some((t) => weakTags.includes(t)))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags,
        xpReward: p.xpReward,
        eloReward: p.eloReward,
        solvedCount: p.solvedCount,
      }));

    void problems;
    res.json({
      solveSpeed: { averageMs: avgSpeed, fastestMs: fastestSpeed },
      accuracy: { overall: overallAcc, last30: last30Acc },
      languageUsage,
      difficultyBreakdown,
      tagPerformance,
      weeklyActivity: weekly,
      recentTrend,
      skillRadar,
      recommendations,
    });
  },
);

export default router;
