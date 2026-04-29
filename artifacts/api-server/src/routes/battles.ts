import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  battlesTable,
  battleChatTable,
  problemsTable,
  usersTable,
  submissionsTable,
  eloHistoryTable,
  matchQueueTable,
} from "@workspace/db";
import {
  CreateSubmissionBody,
  SendBattleChatBody,
} from "@workspace/api-zod";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import {
  computePairEloChanges,
  rankFromElo,
} from "../lib/elo";
import { hashCode, runTests } from "../lib/runner";
import { recordReplayEvent } from "../lib/replays";
import { applyMissionEvent } from "../lib/missions-engine";
import { pushActivity, pushNotification } from "../lib/activity";

const router: IRouter = Router();

async function loadBattleResponse(battleId: string, viewerId: number) {
  const [battle] = await db
    .select()
    .from(battlesTable)
    .where(eq(battlesTable.id, battleId));
  if (!battle) return null;
  const [problem] = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.id, battle.problemId));
  const [p1] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, battle.player1Id));
  const [p2] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, battle.player2Id));
  const chatRows = await db
    .select()
    .from(battleChatTable)
    .where(eq(battleChatTable.battleId, battleId))
    .orderBy(asc(battleChatTable.createdAt))
    .limit(200);

  const isP1 = battle.player1Id === viewerId;
  const me = isP1 ? p1 : p2;
  const opp = isP1 ? p2 : p1;
  const myPassed = isP1 ? battle.player1Passed : battle.player2Passed;
  const oppPassed = isP1 ? battle.player2Passed : battle.player1Passed;
  const myFinishedAt = isP1
    ? battle.player1FinishedAt
    : battle.player2FinishedAt;
  const oppFinishedAt = isP1
    ? battle.player2FinishedAt
    : battle.player1FinishedAt;
  const totalTests = problem
    ? [...problem.publicTestCases, ...problem.hiddenTestCases].length
    : 0;

  let result: "win" | "loss" | "draw" | null = null;
  let eloChange = 0;
  if (battle.state === "finished") {
    if (battle.result === "draw") {
      result = "draw";
    } else if (battle.winnerId === viewerId) {
      result = "win";
    } else {
      result = "loss";
    }
    const myAfter = isP1 ? battle.player1EloAfter : battle.player2EloAfter;
    const myBefore = isP1 ? battle.player1EloBefore : battle.player2EloBefore;
    eloChange = (myAfter ?? myBefore) - myBefore;
  }

  const durationSeconds = battle.finishedAt
    ? Math.floor(
        (new Date(battle.finishedAt).getTime() -
          new Date(battle.startedAt).getTime()) /
          1000,
      )
    : Math.floor((Date.now() - new Date(battle.startedAt).getTime()) / 1000);

  return {
    id: battle.id,
    state: battle.state,
    startedAt: battle.startedAt.toISOString(),
    finishedAt: battle.finishedAt?.toISOString() ?? null,
    durationSeconds,
    result,
    eloChange,
    winnerUsername:
      battle.winnerId && battle.winnerId === p1?.id
        ? p1?.username
        : battle.winnerId === p2?.id
          ? p2?.username
          : null,
    problem: problem
      ? {
          id: problem.id,
          slug: problem.slug,
          title: problem.title,
          difficulty: problem.difficulty,
          statement: problem.statement,
          inputDescription: problem.inputDescription,
          outputDescription: problem.outputDescription,
          constraints: problem.constraints,
          examples: problem.examples,
          publicTestCases: problem.publicTestCases,
          tags: problem.tags,
          xpReward: problem.xpReward,
          eloReward: problem.eloReward,
          timeLimit: problem.timeLimit,
          memoryLimit: problem.memoryLimit,
          starterCode: problem.starterCode,
        }
      : null,
    you: me
      ? {
          username: me.username,
          displayName: me.displayName,
          avatarSeed: me.avatarSeed,
          eloRating: me.eloRating,
          rank: rankFromElo(me.eloRating),
          passedTests: myPassed,
          totalTests,
          finishedAt: myFinishedAt?.toISOString() ?? null,
        }
      : null,
    opponent: opp
      ? {
          username: opp.username,
          displayName: opp.displayName,
          avatarSeed: opp.avatarSeed,
          eloRating: opp.eloRating,
          rank: rankFromElo(opp.eloRating),
          passedTests: oppPassed,
          totalTests,
          finishedAt: oppFinishedAt?.toISOString() ?? null,
        }
      : null,
    chat: chatRows.map((c) => ({
      id: c.id,
      userId: c.userId,
      message: c.message,
      mine: c.userId === viewerId,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

async function maybeFinishBattle(battleId: string): Promise<void> {
  const [battle] = await db
    .select()
    .from(battlesTable)
    .where(eq(battlesTable.id, battleId));
  if (!battle || battle.state === "finished") return;

  const [problem] = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.id, battle.problemId));
  if (!problem) return;
  const totalTests = [
    ...problem.publicTestCases,
    ...problem.hiddenTestCases,
  ].length;

  const p1Done = battle.player1Passed === totalTests;
  const p2Done = battle.player2Passed === totalTests;
  const battleAgeMs = Date.now() - new Date(battle.startedAt).getTime();
  const TIMEOUT_MS = 15 * 60 * 1000; // 15 min hard cap

  if (!p1Done && !p2Done && battleAgeMs < TIMEOUT_MS) return;

  let winnerId: number | null = null;
  let result: "p1_win" | "p2_win" | "draw" = "draw";

  if (p1Done && !p2Done) {
    winnerId = battle.player1Id;
    result = "p1_win";
  } else if (p2Done && !p1Done) {
    winnerId = battle.player2Id;
    result = "p2_win";
  } else if (p1Done && p2Done) {
    // Whoever finished first
    const t1 = battle.player1FinishedAt
      ? new Date(battle.player1FinishedAt).getTime()
      : Infinity;
    const t2 = battle.player2FinishedAt
      ? new Date(battle.player2FinishedAt).getTime()
      : Infinity;
    if (t1 < t2) {
      winnerId = battle.player1Id;
      result = "p1_win";
    } else if (t2 < t1) {
      winnerId = battle.player2Id;
      result = "p2_win";
    }
  } else {
    // Timeout — most passed wins, else draw
    if (battle.player1Passed > battle.player2Passed) {
      winnerId = battle.player1Id;
      result = "p1_win";
    } else if (battle.player2Passed > battle.player1Passed) {
      winnerId = battle.player2Id;
      result = "p2_win";
    }
  }

  const isRanked = (battle.mode ?? "ranked") === "ranked";
  const isPractice = (battle.mode ?? "ranked") === "practice";

  const changes = isRanked
    ? computePairEloChanges(
        battle.player1EloBefore,
        battle.player2EloBefore,
        result,
      )
    : { p1: 0, p2: 0 };
  const p1After = battle.player1EloBefore + changes.p1;
  const p2After = battle.player2EloBefore + changes.p2;

  const finishedAt = new Date();
  await db
    .update(battlesTable)
    .set({
      state: "finished",
      winnerId,
      result:
        result === "p1_win"
          ? "p1_win"
          : result === "p2_win"
            ? "p2_win"
            : "draw",
      player1EloAfter: p1After,
      player2EloAfter: p2After,
      finishedAt,
    })
    .where(eq(battlesTable.id, battleId));

  // Record replay finish event
  await recordReplayEvent(battleId, battle.startedAt, {
    type: "finish",
    userId: winnerId ?? 0,
    message:
      result === "draw" ? "draw" : result === "p1_win" ? "p1_win" : "p2_win",
  });

  // Update users (skip stat changes for practice; XP only for normal)
  const [p1] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, battle.player1Id));
  const [p2] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, battle.player2Id));

  for (const [user, eloAfter, isWinner, isDraw] of [
    [p1, p1After, winnerId === battle.player1Id, winnerId === null],
    [p2, p2After, winnerId === battle.player2Id, winnerId === null],
  ] as const) {
    if (!user || user.isBot === 1) continue;
    if (isPractice) {
      // Practice: only minimal XP
      const xpAdd = isWinner ? 25 : 5;
      await db
        .update(usersTable)
        .set({ xp: user.xp + xpAdd })
        .where(eq(usersTable.id, user.id));
      continue;
    }
    const newWins = user.battleWins + (isWinner ? 1 : 0);
    const newLosses = user.battleLosses + (!isWinner && !isDraw ? 1 : 0);
    const newDraws = user.battleDraws + (isDraw ? 1 : 0);
    const newStreak = isWinner ? user.winStreak + 1 : 0;
    const xpAdd = isWinner ? 100 : isDraw ? 30 : 10;
    const coinAdd = isWinner ? 25 : isDraw ? 10 : 5;
    if (isRanked) {
      const newHighestElo = Math.max(user.highestElo, eloAfter);
      const newHighestRank = rankFromElo(newHighestElo);
      await db
        .update(usersTable)
        .set({
          eloRating: eloAfter,
          highestElo: newHighestElo,
          battleWins: newWins,
          battleLosses: newLosses,
          battleDraws: newDraws,
          winStreak: newStreak,
          xp: user.xp + xpAdd,
          coins: user.coins + coinAdd,
          highestRank: newHighestRank,
        })
        .where(eq(usersTable.id, user.id));
      await db.insert(eloHistoryTable).values({
        userId: user.id,
        elo: eloAfter,
        change: eloAfter - user.eloRating,
        reason: isWinner ? "Тулаанд ялсан" : isDraw ? "Тэнцсэн" : "Тулаанд унасан",
        battleId,
      });
    } else {
      // normal mode: stats but no ELO change
      await db
        .update(usersTable)
        .set({
          battleWins: newWins,
          battleLosses: newLosses,
          battleDraws: newDraws,
          winStreak: newStreak,
          xp: user.xp + xpAdd,
          coins: user.coins + coinAdd,
        })
        .where(eq(usersTable.id, user.id));
    }
    if (isWinner) {
      await applyMissionEvent({ userId: user.id, type: "battle_win" });
      await pushActivity(user.id, "battle_win", {
        battleId,
        eloChange: eloAfter - user.eloRating,
        mode: battle.mode,
      });
    }
    if (!isWinner && !isDraw) {
      await pushNotification(
        user.id,
        "battle_loss",
        "Тулаанд хожигдлоо",
        `Бүү бууж өг! Дахин оролд.`,
        `/battle/${battleId}`,
      );
    }
  }

  // Clean up queue entries
  await db
    .delete(matchQueueTable)
    .where(eq(matchQueueTable.pendingBattleId, battleId));
}

router.get(
  "/battles/:id",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    // Try to finish if conditions are met (e.g. timeout)
    await maybeFinishBattle(id);
    const data = await loadBattleResponse(id, req.user.id);
    if (!data) {
      res.status(404).json({ error: "Тулаан олдсонгүй" });
      return;
    }
    if (
      !data.you ||
      (data.you.username !== req.user.username &&
        data.opponent?.username !== req.user.username)
    ) {
      // viewer is neither participant
      const [b] = await db
        .select()
        .from(battlesTable)
        .where(eq(battlesTable.id, id));
      if (
        b &&
        b.player1Id !== req.user.id &&
        b.player2Id !== req.user.id
      ) {
        res.status(403).json({ error: "Хандалт байхгүй" });
        return;
      }
    }
    res.json(data);
  },
);

router.post(
  "/battles/:id/submit",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const parsed = CreateSubmissionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const [battle] = await db
      .select()
      .from(battlesTable)
      .where(eq(battlesTable.id, id));
    if (!battle) {
      res.status(404).json({ error: "Тулаан олдсонгүй" });
      return;
    }
    if (
      battle.player1Id !== req.user.id &&
      battle.player2Id !== req.user.id
    ) {
      res.status(403).json({ error: "Хандалт байхгүй" });
      return;
    }
    if (battle.state !== "in_battle") {
      res.status(400).json({ error: "Тулаан дууссан" });
      return;
    }

    // Cooldown check
    const cutoff = new Date(Date.now() - 3000);
    const recent = await db
      .select()
      .from(submissionsTable)
      .where(
        and(
          eq(submissionsTable.userId, req.user.id),
          eq(submissionsTable.battleId, id),
        ),
      )
      .orderBy(desc(submissionsTable.createdAt))
      .limit(1);
    if (recent.length && new Date(recent[0].createdAt) > cutoff) {
      res.status(429).json({ error: "Хэт олон удаа илгээж байна" });
      return;
    }

    const [problem] = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.id, battle.problemId));
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
        battleId: id,
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

    const isP1 = battle.player1Id === req.user.id;
    const newPassed = result.passedCount;
    const isFinishedAttempt = result.passedCount === result.totalCount;

    const updates: Record<string, unknown> = isP1
      ? { player1Passed: Math.max(battle.player1Passed, newPassed) }
      : { player2Passed: Math.max(battle.player2Passed, newPassed) };
    if (isFinishedAttempt) {
      if (isP1 && !battle.player1FinishedAt)
        updates.player1FinishedAt = new Date();
      if (!isP1 && !battle.player2FinishedAt)
        updates.player2FinishedAt = new Date();
    }
    await db
      .update(battlesTable)
      .set(updates)
      .where(eq(battlesTable.id, id));

    // Replay events: code snapshot + submission
    await recordReplayEvent(id, battle.startedAt, {
      type: "code",
      userId: req.user.id,
      code: parsed.data.code,
    });
    await recordReplayEvent(id, battle.startedAt, {
      type: "submission",
      userId: req.user.id,
      passed: result.passedCount,
      total: result.totalCount,
    });

    // If problem fully solved on a problem (not battle), still emit problem_solved mission event
    if (result.status === "accepted") {
      await applyMissionEvent({
        userId: req.user.id,
        type: "problem_solved",
        difficulty: problem.difficulty,
      });
    }

    await maybeFinishBattle(id);

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

router.post(
  "/battles/:id/forfeit",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const [battle] = await db
      .select()
      .from(battlesTable)
      .where(eq(battlesTable.id, id));
    if (!battle) {
      res.status(404).json({ error: "Тулаан олдсонгүй" });
      return;
    }
    if (
      battle.player1Id !== req.user.id &&
      battle.player2Id !== req.user.id
    ) {
      res.status(403).json({ error: "Хандалт байхгүй" });
      return;
    }
    if (battle.state !== "in_battle") {
      res.json({ ok: true });
      return;
    }
    const [problem] = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.id, battle.problemId));
    const totalTests = problem
      ? [...problem.publicTestCases, ...problem.hiddenTestCases].length
      : 0;
    const isP1 = battle.player1Id === req.user.id;
    // Forfeit: opponent gets full credit, you keep your existing partial score (probably 0)
    const updates: Record<string, unknown> = {};
    if (isP1) {
      updates.player2Passed = totalTests;
      updates.player2FinishedAt = new Date();
    } else {
      updates.player1Passed = totalTests;
      updates.player1FinishedAt = new Date();
    }
    await db
      .update(battlesTable)
      .set(updates)
      .where(eq(battlesTable.id, id));
    await maybeFinishBattle(id);
    res.json({ ok: true });
  },
);

router.post(
  "/battles/:id/chat",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const parsed = SendBattleChatBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const [battle] = await db
      .select()
      .from(battlesTable)
      .where(eq(battlesTable.id, id));
    if (!battle) {
      res.status(404).json({ error: "Тулаан олдсонгүй" });
      return;
    }
    if (
      battle.player1Id !== req.user.id &&
      battle.player2Id !== req.user.id
    ) {
      res.status(403).json({ error: "Хандалт байхгүй" });
      return;
    }
    const [row] = await db
      .insert(battleChatTable)
      .values({
        battleId: id,
        userId: req.user.id,
        message: parsed.data.message,
      })
      .returning();
    await recordReplayEvent(id, battle.startedAt, {
      type: "chat",
      userId: req.user.id,
      message: parsed.data.message,
    });
    res.json({
      id: row.id,
      userId: row.userId,
      message: row.message,
      mine: true,
      createdAt: row.createdAt.toISOString(),
    });
  },
);

export default router;
