import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  matchQueueTable,
  usersTable,
} from "@workspace/db";
import { AcceptMatchBody } from "@workspace/api-zod";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { rankFromElo } from "../lib/elo";
import {
  expireStaleMatches,
  tryFindMatch,
  tryStartBattleIfBothAccepted,
} from "../lib/matchmaking";

const router: IRouter = Router();

router.post(
  "/queue/join",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const [existing] = await db
      .select()
      .from(matchQueueTable)
      .where(eq(matchQueueTable.userId, req.user.id));
    if (existing) {
      // Reset to fresh searching
      await db
        .update(matchQueueTable)
        .set({
          state: "searching",
          eloAtJoin: req.user.eloRating,
          matchId: null,
          opponentUserId: null,
          pendingBattleId: null,
          acceptDeadline: null,
          acceptedAt: null,
          joinedAt: new Date(),
        })
        .where(eq(matchQueueTable.userId, req.user.id));
    } else {
      await db.insert(matchQueueTable).values({
        userId: req.user.id,
        eloAtJoin: req.user.eloRating,
        state: "searching",
        joinedAt: new Date(),
      });
    }
    res.json({ ok: true, state: "searching" });
  },
);

router.post(
  "/queue/cancel",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    await db
      .delete(matchQueueTable)
      .where(eq(matchQueueTable.userId, req.user.id));
    res.json({ ok: true });
  },
);

router.get(
  "/queue/status",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    await expireStaleMatches();

    let [entry] = await db
      .select()
      .from(matchQueueTable)
      .where(eq(matchQueueTable.userId, req.user.id));

    if (!entry) {
      res.json({ state: "idle" });
      return;
    }

    if (entry.state === "searching") {
      const found = await tryFindMatch(req.user.id);
      if (found) {
        [entry] = await db
          .select()
          .from(matchQueueTable)
          .where(eq(matchQueueTable.userId, req.user.id));
      }
    }

    if (entry.state === "accepted" && entry.matchId) {
      const battleId = await tryStartBattleIfBothAccepted(entry.matchId);
      if (battleId) {
        [entry] = await db
          .select()
          .from(matchQueueTable)
          .where(eq(matchQueueTable.userId, req.user.id));
      }
    }

    const elapsedSec = Math.floor(
      (Date.now() - new Date(entry.joinedAt).getTime()) / 1000,
    );
    const range = Math.min(50 + elapsedSec * 25, 800);

    let opponentInfo = null;
    if (entry.opponentUserId) {
      const [opp] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, entry.opponentUserId));
      if (opp) {
        opponentInfo = {
          username: opp.username,
          displayName: opp.displayName,
          avatarSeed: opp.avatarSeed,
          eloRating: opp.eloRating,
          rank: rankFromElo(opp.eloRating),
        };
      }
    }

    res.json({
      state: entry.state,
      secondsInQueue: elapsedSec,
      searchRange: range,
      matchId: entry.matchId,
      battleId: entry.pendingBattleId,
      opponent: opponentInfo,
      acceptDeadline: entry.acceptDeadline?.toISOString() ?? null,
    });
  },
);

router.post(
  "/queue/accept",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = AcceptMatchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const matchId = parsed.data.matchId;
    const accept = parsed.data.accept;

    const rows = await db
      .select()
      .from(matchQueueTable)
      .where(eq(matchQueueTable.matchId, matchId));
    if (rows.length === 0) {
      res.status(404).json({ error: "Тохироо олдсонгүй" });
      return;
    }
    const mine = rows.find((r) => r.userId === req.user!.id);
    if (!mine) {
      res.status(403).json({ error: "Хандалт байхгүй" });
      return;
    }

    if (!accept) {
      // Decline: remove both, the other goes back to queue
      const other = rows.find((r) => r.userId !== req.user!.id);
      await db
        .delete(matchQueueTable)
        .where(eq(matchQueueTable.userId, req.user.id));
      if (other) {
        await db
          .update(matchQueueTable)
          .set({
            state: "searching",
            matchId: null,
            opponentUserId: null,
            acceptDeadline: null,
            acceptedAt: null,
            joinedAt: new Date(),
          })
          .where(eq(matchQueueTable.userId, other.userId));
      }
      res.json({ ok: true, state: "idle" });
      return;
    }

    await db
      .update(matchQueueTable)
      .set({ state: "accepted", acceptedAt: new Date() })
      .where(eq(matchQueueTable.userId, req.user.id));

    const battleId = await tryStartBattleIfBothAccepted(matchId);
    res.json({ ok: true, battleId });
  },
);

export default router;
