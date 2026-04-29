import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, problemsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/problems", async (req, res): Promise<void> => {
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
    })),
  );
});

router.get("/problems/:slug", async (req, res): Promise<void> => {
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
