import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  replaysTable,
  battlesTable,
  problemsTable,
  usersTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/api/replays/:battleId", async (req, res): Promise<void> => {
  const battleId = String(req.params.battleId);
  const [replay] = await db
    .select()
    .from(replaysTable)
    .where(eq(replaysTable.battleId, battleId));
  if (!replay) {
    res.status(404).json({ error: "Давталт олдсонгүй" });
    return;
  }
  const [battle] = await db
    .select()
    .from(battlesTable)
    .where(eq(battlesTable.id, battleId));
  const [problem] = battle
    ? await db
        .select({ id: problemsTable.id, title: problemsTable.title })
        .from(problemsTable)
        .where(eq(problemsTable.id, battle.problemId))
    : [];
  const [p1] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, replay.player1Id));
  const [p2] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, replay.player2Id));

  res.json({
    battleId: replay.battleId,
    problemId: replay.problemId,
    problemTitle: problem?.title ?? "Дасгал",
    durationMs: replay.durationMs,
    players: [
      {
        userId: p1?.id ?? 0,
        username: p1?.username ?? "?",
        displayName: p1?.displayName ?? "?",
        avatarSeed: p1?.avatarSeed ?? null,
        eloBefore: battle?.player1EloBefore ?? 0,
        eloAfter: battle?.player1EloAfter ?? null,
        finalPassed: battle?.player1Passed ?? 0,
      },
      {
        userId: p2?.id ?? 0,
        username: p2?.username ?? "?",
        displayName: p2?.displayName ?? "?",
        avatarSeed: p2?.avatarSeed ?? null,
        eloBefore: battle?.player2EloBefore ?? 0,
        eloAfter: battle?.player2EloAfter ?? null,
        finalPassed: battle?.player2Passed ?? 0,
      },
    ],
    events: Array.isArray(replay.events) ? replay.events : [],
  });
});

export default router;
