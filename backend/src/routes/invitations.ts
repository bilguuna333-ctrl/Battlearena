import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, or, sql } from "drizzle-orm";
import {
  db,
  battleInvitationsTable,
  battlesTable,
  problemsTable,
  usersTable,
} from "@workspace/db";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { ensureReplay } from "../lib/replays";
import { emitToUser } from "../lib/socket";
import { rankFromElo } from "../lib/elo";

const router: IRouter = Router();

const INVITATION_TTL_MS = 60 * 1000; // 60 seconds
const VALID_MODES = new Set(["ranked", "normal", "practice"]);

type InvitationRow = typeof battleInvitationsTable.$inferSelect;

async function expireOldInvitations() {
  await db
    .update(battleInvitationsTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(battleInvitationsTable.status, "pending"),
        sql`${battleInvitationsTable.expiresAt} < NOW()`,
      ),
    );
}

async function userBriefById(id: number) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarSeed: u.avatarSeed,
    eloRating: u.eloRating,
    rank: rankFromElo(u.eloRating),
  };
}

async function serializeInvitation(row: InvitationRow) {
  const [from, to] = await Promise.all([
    userBriefById(row.fromUserId),
    userBriefById(row.toUserId),
  ]);
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    battleId: row.battleId,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    from,
    to,
  };
}

router.post(
  "/api/battles/invite",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }

    const usernameRaw = String(req.body?.username ?? "").trim().toLowerCase();
    const modeRaw = String(req.body?.mode ?? "ranked");
    const mode = VALID_MODES.has(modeRaw) ? modeRaw : "ranked";

    if (!usernameRaw) {
      res.status(400).json({ error: "Хэрэглэгчийн нэр шаардлагатай" });
      return;
    }
    if (usernameRaw === req.user.username.toLowerCase()) {
      res.status(400).json({ error: "Өөрийгөө урих боломжгүй" });
      return;
    }

    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, usernameRaw));
    if (!target) {
      res.status(404).json({ error: "Хэрэглэгч олдсонгүй" });
      return;
    }

    await expireOldInvitations();

    // Prevent duplicate pending invitation between same pair
    const existing = await db
      .select()
      .from(battleInvitationsTable)
      .where(
        and(
          eq(battleInvitationsTable.fromUserId, req.user.id),
          eq(battleInvitationsTable.toUserId, target.id),
          eq(battleInvitationsTable.status, "pending"),
        ),
      );
    if (existing.length > 0) {
      res.status(409).json({ error: "Энэ хэрэглэгчийг аль хэдийн уриад байна" });
      return;
    }

    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const [row] = await db
      .insert(battleInvitationsTable)
      .values({
        id,
        fromUserId: req.user.id,
        toUserId: target.id,
        mode,
        status: "pending",
        expiresAt,
      })
      .returning();

    const payload = await serializeInvitation(row);
    emitToUser(target.username, "battle:invitation", payload);
    emitToUser(req.user.username, "battle:invitation:sent", payload);

    res.json(payload);
  },
);

router.get(
  "/api/battles/invitations",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    await expireOldInvitations();

    const rows = await db
      .select()
      .from(battleInvitationsTable)
      .where(
        and(
          or(
            eq(battleInvitationsTable.fromUserId, req.user.id),
            eq(battleInvitationsTable.toUserId, req.user.id),
          ),
          eq(battleInvitationsTable.status, "pending"),
        )!,
      )
      .orderBy(desc(battleInvitationsTable.createdAt));

    const incoming: any[] = [];
    const outgoing: any[] = [];
    for (const row of rows) {
      const payload = await serializeInvitation(row);
      if (row.toUserId === req.user.id) incoming.push(payload);
      else outgoing.push(payload);
    }
    res.json({ incoming, outgoing });
  },
);

router.post(
  "/api/battles/invitations/:id/accept",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    await expireOldInvitations();
    const [inv] = await db
      .select()
      .from(battleInvitationsTable)
      .where(eq(battleInvitationsTable.id, id));
    if (!inv) {
      res.status(404).json({ error: "Урилга олдсонгүй" });
      return;
    }
    if (inv.toUserId !== req.user.id) {
      res.status(403).json({ error: "Энэ урилга танд хамаарахгүй" });
      return;
    }
    if (inv.status !== "pending") {
      res.status(409).json({ error: "Урилга идэвхгүй байна" });
      return;
    }

    // Pick random problem
    const [problem] = await db
      .select({ id: problemsTable.id })
      .from(problemsTable)
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!problem) {
      res.status(500).json({ error: "Дасгал олдсонгүй" });
      return;
    }

    const [fromUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, inv.fromUserId));
    const [toUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, inv.toUserId));
    if (!fromUser || !toUser) {
      res.status(500).json({ error: "Хэрэглэгч олдсонгүй" });
      return;
    }

    const battleId = crypto.randomUUID();
    await db.insert(battlesTable).values({
      id: battleId,
      problemId: problem.id,
      player1Id: fromUser.id,
      player2Id: toUser.id,
      state: "in_battle",
      mode: inv.mode,
      player1EloBefore: fromUser.eloRating,
      player2EloBefore: toUser.eloRating,
      startedAt: new Date(),
    });
    await ensureReplay(battleId, problem.id, fromUser.id, toUser.id);

    const [updated] = await db
      .update(battleInvitationsTable)
      .set({ status: "accepted", battleId, respondedAt: new Date() })
      .where(eq(battleInvitationsTable.id, id))
      .returning();

    const payload = await serializeInvitation(updated);
    emitToUser(fromUser.username, "battle:invitation:accepted", { ...payload, battleId });
    emitToUser(toUser.username, "battle:invitation:accepted", { ...payload, battleId });

    res.json({ battleId, invitation: payload });
  },
);

router.post(
  "/api/battles/invitations/:id/decline",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const [inv] = await db
      .select()
      .from(battleInvitationsTable)
      .where(eq(battleInvitationsTable.id, id));
    if (!inv) {
      res.status(404).json({ error: "Урилга олдсонгүй" });
      return;
    }
    if (inv.toUserId !== req.user.id) {
      res.status(403).json({ error: "Энэ урилга танд хамаарахгүй" });
      return;
    }
    if (inv.status !== "pending") {
      res.status(409).json({ error: "Урилга идэвхгүй байна" });
      return;
    }
    const [updated] = await db
      .update(battleInvitationsTable)
      .set({ status: "declined", respondedAt: new Date() })
      .where(eq(battleInvitationsTable.id, id))
      .returning();

    const [fromUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, inv.fromUserId));
    const payload = await serializeInvitation(updated);
    if (fromUser) {
      emitToUser(fromUser.username, "battle:invitation:declined", payload);
    }
    emitToUser(req.user.username, "battle:invitation:declined", payload);
    res.json(payload);
  },
);

router.post(
  "/api/battles/invitations/:id/cancel",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const [inv] = await db
      .select()
      .from(battleInvitationsTable)
      .where(eq(battleInvitationsTable.id, id));
    if (!inv) {
      res.status(404).json({ error: "Урилга олдсонгүй" });
      return;
    }
    if (inv.fromUserId !== req.user.id) {
      res.status(403).json({ error: "Энэ урилга танд хамаарахгүй" });
      return;
    }
    if (inv.status !== "pending") {
      res.status(409).json({ error: "Урилга идэвхгүй байна" });
      return;
    }
    const [updated] = await db
      .update(battleInvitationsTable)
      .set({ status: "cancelled", respondedAt: new Date() })
      .where(eq(battleInvitationsTable.id, id))
      .returning();

    const [toUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, inv.toUserId));
    const payload = await serializeInvitation(updated);
    if (toUser) {
      emitToUser(toUser.username, "battle:invitation:cancelled", payload);
    }
    emitToUser(req.user.username, "battle:invitation:cancelled", payload);
    res.json(payload);
  },
);

export default router;
