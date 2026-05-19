import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  hiringChallengesTable,
  challengeApplicationsTable,
  problemsTable,
  usersTable,
} from "@workspace/db";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { rankFromElo } from "../lib/elo";

const router: IRouter = Router();

router.get(
  "/api/hiring/challenges",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const challenges = await db
      .select()
      .from(hiringChallengesTable)
      .orderBy(desc(hiringChallengesTable.createdAt));
    if (challenges.length === 0) {
      res.json([]);
      return;
    }
    const companyIds = Array.from(new Set(challenges.map((c) => c.companyId)));
    const companies = await db
      .select()
      .from(usersTable)
      .where(inArray(usersTable.id, companyIds));
    const companyMap = new Map(companies.map((u) => [u.id, u]));
    const myApps = await db
      .select()
      .from(challengeApplicationsTable)
      .where(eq(challengeApplicationsTable.userId, req.user.id));
    const myAppByChallenge = new Map(myApps.map((a) => [a.challengeId, a]));
    const allApps = await db
      .select({
        challengeId: challengeApplicationsTable.challengeId,
        userId: challengeApplicationsTable.userId,
      })
      .from(challengeApplicationsTable)
      .where(
        inArray(
          challengeApplicationsTable.challengeId,
          challenges.map((c) => c.id),
        ),
      );
    const appCount = new Map<number, number>();
    for (const a of allApps) {
      appCount.set(a.challengeId, (appCount.get(a.challengeId) ?? 0) + 1);
    }
    res.json(
      challenges.map((c) => {
        const company = companyMap.get(c.companyId);
        const problemArr = Array.isArray(c.problemIds) ? (c.problemIds as number[]) : [];
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          companyUsername: company?.username ?? "?",
          companyDisplayName: company?.displayName ?? "?",
          problemCount: problemArr.length,
          applicantCount: appCount.get(c.id) ?? 0,
          positions: c.positions,
          closesAt: c.closesAt?.toISOString() ?? null,
          applied: myAppByChallenge.has(c.id),
        };
      }),
    );
  },
);

router.get(
  "/api/hiring/challenges/:id",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const [c] = await db
      .select()
      .from(hiringChallengesTable)
      .where(eq(hiringChallengesTable.id, id));
    if (!c) {
      res.status(404).json({ error: "Шалгалт олдсонгүй" });
      return;
    }
    const [company] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, c.companyId));
    const problemIds = Array.isArray(c.problemIds) ? (c.problemIds as number[]) : [];
    const problems = problemIds.length
      ? await db
          .select()
          .from(problemsTable)
          .where(inArray(problemsTable.id, problemIds))
      : [];
    const apps = await db
      .select()
      .from(challengeApplicationsTable)
      .where(eq(challengeApplicationsTable.challengeId, id));
    const myApp = apps.find((a) => a.userId === req.user!.id);
    res.json({
      id: c.id,
      title: c.title,
      description: c.description,
      companyUsername: company?.username ?? "?",
      companyDisplayName: company?.displayName ?? "?",
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
      applicantCount: apps.length,
      positions: c.positions,
      closesAt: c.closesAt?.toISOString() ?? null,
      applied: !!myApp,
      myStatus: myApp?.status ?? "not_applied",
      myScore: myApp?.score ?? null,
      mySolved: myApp?.solvedCount ?? null,
    });
  },
);

router.post(
  "/api/hiring/challenges/:id/apply",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const [c] = await db
      .select()
      .from(hiringChallengesTable)
      .where(eq(hiringChallengesTable.id, id));
    if (!c) {
      res.status(404).json({ error: "Шалгалт олдсонгүй" });
      return;
    }
    await db
      .insert(challengeApplicationsTable)
      .values({
        challengeId: id,
        userId: req.user.id,
        score: 0,
        solvedCount: 0,
        status: "applied",
      })
      .onConflictDoNothing();
    res.json({ ok: true });
  },
);

router.get(
  "/api/hiring/challenges/:id/leaderboard",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const apps = await db
      .select()
      .from(challengeApplicationsTable)
      .where(eq(challengeApplicationsTable.challengeId, id))
      .orderBy(
        desc(challengeApplicationsTable.solvedCount),
        desc(challengeApplicationsTable.score),
        asc(challengeApplicationsTable.createdAt),
      );
    if (apps.length === 0) {
      res.json([]);
      return;
    }
    const userIds = apps.map((a) => a.userId);
    const users = await db
      .select()
      .from(usersTable)
      .where(inArray(usersTable.id, userIds));
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json(
      apps.map((a, idx) => {
        const u = userMap.get(a.userId);
        return {
          position: idx + 1,
          username: u?.username ?? "?",
          displayName: u?.displayName ?? "?",
          avatarSeed: u?.avatarSeed ?? null,
          score: a.score,
          solvedCount: a.solvedCount,
          status: a.status,
          eloRating: u?.eloRating ?? 0,
          rank: u ? rankFromElo(u.eloRating) : "?",
        };
      }),
    );
  },
);

void and;

export default router;
