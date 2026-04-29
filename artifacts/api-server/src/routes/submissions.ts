import { Router, type IRouter } from "express";
import { and, desc, eq, gt } from "drizzle-orm";
import { db, problemsTable, submissionsTable } from "@workspace/db";
import { CreateSubmissionBody } from "@workspace/api-zod";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { hashCode, runTests } from "../lib/runner";

const router: IRouter = Router();

const SUBMISSION_COOLDOWN_MS = 3000;

router.post(
  "/submissions",
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
        results: result.results,
        codeHash,
      })
      .returning();
    res.json({
      id: submission.id,
      status: result.status,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      runtimeMs: result.runtimeMs,
      xpGained: result.status === "accepted" ? problem.xpReward : 0,
      message: result.message,
      results: result.results.map((r) => ({
        passed: r.passed,
        input: r.input,
        expected: r.expected,
        actual: r.actual,
      })),
    });
  },
);

router.get(
  "/submissions/recent",
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
