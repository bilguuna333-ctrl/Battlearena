import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, problemsTable, submissionsTable } from "@workspace/db";
import { optionalAuth, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/api/problems",
  optionalAuth,
  async (req: AuthedRequest, res): Promise<void> => {
    const difficulty = req.query.difficulty;
    let rows;
    if (typeof difficulty === "string" && difficulty.length > 0) {
      rows = await db
        .select()
        .from(problemsTable)
        .where(eq(problemsTable.difficulty, difficulty))
        .orderBy(desc(problemsTable.solvedCount));
    } else {
      rows = await db
        .select()
        .from(problemsTable)
        .orderBy(desc(problemsTable.solvedCount));
    }

    // If the request is authenticated, mark which problems the user has
    // already solved (any accepted submission). Otherwise default to false.
    let solvedSet = new Set<number>();
    if (req.user) {
      const accepted = await db
        .select({ problemId: submissionsTable.problemId })
        .from(submissionsTable)
        .where(
          and(
            eq(submissionsTable.userId, req.user.id),
            eq(submissionsTable.status, "accepted"),
          ),
        );
      solvedSet = new Set(accepted.map((s) => s.problemId));
    }

    res.json(
      rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags,
        xpReward: p.xpReward,
        eloReward: p.eloReward,
        solvedCount: p.solvedCount,
        solved: solvedSet.has(p.id),
      })),
    );
  },
);

router.get("/api/problems/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [p] = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.slug, slug));
  if (!p) {
    res.status(404).json({ error: "Дасгал олдсонгүй" });
    return;
  }
  res.json({
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
  });
});

export default router;
