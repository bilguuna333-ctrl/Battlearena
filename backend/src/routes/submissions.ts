import { Router, type IRouter } from "express";
import { and, desc, eq, gt } from "drizzle-orm";
import {
  db,
  problemsTable,
  submissionsTable,
  usersTable,
} from "@workspace/db";
import { CreateSubmissionBody } from "@workspace/api-zod";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { hashCode, runTests } from "../lib/runner";
import { applyMissionEvent } from "../lib/missions-engine";
import { pushActivity } from "../lib/activity";

const router: IRouter = Router();

const SUBMISSION_COOLDOWN_MS = 3000;

router.post(
  "/api/submissions",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = CreateSubmissionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    // Anti-cheat: cooldown
    const cutoff = new Date(Date.now() - SUBMISSION_COOLDOWN_MS);
    const recent = await db
      .select()
      .from(submissionsTable)
      .where(
        and(
          eq(submissionsTable.userId, req.user.id),
          gt(submissionsTable.createdAt, cutoff),
        ),
      );
    if (recent.length > 0) {
      res.status(429).json({ error: "Хэт олон удаа илгээж байна" });
      return;
    }
    const [problem] = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.slug, parsed.data.problemSlug));
    if (!problem) {
      res.status(404).json({ error: "Дасгал олдсонгүй" });
      return;
    }
    const allCases = [...problem.publicTestCases, ...problem.hiddenTestCases];
    const result = runTests(parsed.data.language, parsed.data.code, allCases);
    const codeHash = hashCode(parsed.data.code);

    const serializedResults = result.results.map((r) => ({
      passed: r.passed,
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      ...(r.error ? { error: r.error } : {}),
    }));

    const [submission] = await db
      .insert(submissionsTable)
      .values({
        userId: req.user.id,
        problemId: problem.id,
        battleId: null,
        language: parsed.data.language,
        code: parsed.data.code,
        status: result.status,
        passedCount: result.passedCount,
        totalCount: result.totalCount,
        runtimeMs: result.runtimeMs,
        message: result.message,
        results: serializedResults,
        codeHash,
      })
      .returning();

    // Award XP / coins on every accepted submission. Coins are roughly
    // a third of the XP reward, rounded up.
    let xpGained = 0;
    let coinsGained = 0;
    if (result.status === "accepted") {
      xpGained = problem.xpReward;
      coinsGained = Math.max(1, Math.ceil(problem.xpReward / 3));
      await db
        .update(usersTable)
        .set({
          xp: req.user.xp + xpGained,
          coins: req.user.coins + coinsGained,
        })
        .where(eq(usersTable.id, req.user.id));
      // Bump global solve counter for the problem
      await db
        .update(problemsTable)
        .set({ solvedCount: problem.solvedCount + 1 })
        .where(eq(problemsTable.id, problem.id));
      // Mission progress + activity feed
      await applyMissionEvent({
        userId: req.user.id,
        type: "problem_solved",
        difficulty: problem.difficulty,
      });
      await pushActivity(req.user.id, "problem_solved", {
        slug: problem.slug,
        title: problem.title,
        xp: xpGained,
      });
    }

    res.json({
      id: submission.id,
      status: result.status,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      runtimeMs: result.runtimeMs,
      xpGained,
      coinsGained,
      message: result.message,
      results: serializedResults,
    });
  },
);

router.get(
  "/api/submissions/recent",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const rows = await db
      .select({
        sub: submissionsTable,
        problem: problemsTable,
      })
      .from(submissionsTable)
      .innerJoin(
        problemsTable,
        eq(problemsTable.id, submissionsTable.problemId),
      )
      .where(eq(submissionsTable.userId, req.user.id))
      .orderBy(desc(submissionsTable.createdAt))
      .limit(20);
    res.json(
      rows.map(({ sub, problem }) => ({
        id: sub.id,
        problemTitle: problem.title,
        problemSlug: problem.slug,
        status: sub.status,
        language: sub.language,
        createdAt: sub.createdAt.toISOString(),
      })),
    );
  },
);

export default router;
