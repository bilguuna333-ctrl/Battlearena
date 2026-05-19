import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  lobbiesTable,
  lobbyMembersTable,
  battlesTable,
  problemsTable,
  usersTable,
} from "@workspace/db";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { ensureReplay } from "../lib/replays";
import { emitToUser } from "../lib/socket";
import { rankFromElo } from "../lib/elo";

const router: IRouter = Router();

const LOBBY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const VALID_MODES = new Set(["ranked", "normal", "practice"]);
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LENGTH = 6;

type LobbyRow = typeof lobbiesTable.$inferSelect;
type MemberRow = typeof lobbyMembersTable.$inferSelect;

function generateCode(): string {
  let out = "";
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateCode();
    const [existing] = await db
      .select({ id: lobbiesTable.id })
      .from(lobbiesTable)
      .where(eq(lobbiesTable.code, code));
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique lobby code");
}

async function memberWithUser(member: MemberRow) {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, member.userId));
  if (!u) return null;
  return {
    userId: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarSeed: u.avatarSeed,
    eloRating: u.eloRating,
    rank: rankFromElo(u.eloRating),
    isHost: member.isHost === 1,
    ready: member.ready === 1,
    joinedAt: member.joinedAt.toISOString(),
  };
}

async function serializeLobby(lobby: LobbyRow) {
  const memberRows = await db
    .select()
    .from(lobbyMembersTable)
    .where(eq(lobbyMembersTable.lobbyId, lobby.id));
  const members = (
    await Promise.all(memberRows.map(memberWithUser))
  ).filter(Boolean);

  return {
    id: lobby.id,
    code: lobby.code,
    hostUserId: lobby.hostUserId,
    mode: lobby.mode,
    maxPlayers: lobby.maxPlayers,
    state: lobby.state,
    battleId: lobby.battleId,
    createdAt: lobby.createdAt.toISOString(),
    expiresAt: lobby.expiresAt.toISOString(),
    members,
  };
}

async function expireOldLobbies() {
  await db
    .update(lobbiesTable)
    .set({ state: "closed" })
    .where(
      and(
        eq(lobbiesTable.state, "open"),
        sql`${lobbiesTable.expiresAt} < NOW()`,
      ),
    );
}

async function broadcastLobby(lobbyId: string, event: string) {
  const [lobby] = await db
    .select()
    .from(lobbiesTable)
    .where(eq(lobbiesTable.id, lobbyId));
  if (!lobby) return null;
  const payload = await serializeLobby(lobby);
  for (const m of payload.members) {
    if (m) emitToUser(m.username, event, payload);
  }
  return payload;
}

// --- Create lobby ---------------------------------------------------------
router.post(
  "/api/lobbies",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }

    const modeRaw = String(req.body?.mode ?? "normal");
    const mode = VALID_MODES.has(modeRaw) ? modeRaw : "normal";
    const maxPlayersRaw = Number(req.body?.maxPlayers ?? 2);
    const maxPlayers =
      Number.isInteger(maxPlayersRaw) && maxPlayersRaw >= 2 && maxPlayersRaw <= 8
        ? maxPlayersRaw
        : 2;

    // Cleanup any open lobbies the user previously hosted
    await db
      .update(lobbiesTable)
      .set({ state: "closed" })
      .where(
        and(
          eq(lobbiesTable.hostUserId, req.user.id),
          eq(lobbiesTable.state, "open"),
        ),
      );
    // Drop any prior member rows for this user
    await db
      .delete(lobbyMembersTable)
      .where(eq(lobbyMembersTable.userId, req.user.id));

    const id = crypto.randomUUID();
    const code = await uniqueCode();
    const expiresAt = new Date(Date.now() + LOBBY_TTL_MS);

    const [lobby] = await db
      .insert(lobbiesTable)
      .values({
        id,
        code,
        hostUserId: req.user.id,
        mode,
        maxPlayers,
        state: "open",
        expiresAt,
      })
      .returning();

    await db.insert(lobbyMembersTable).values({
      lobbyId: id,
      userId: req.user.id,
      isHost: 1,
      ready: 1,
    });

    const payload = await serializeLobby(lobby);
    res.json(payload);
  },
);

// --- Get my current lobby --------------------------------------------------
router.get(
  "/api/lobbies/mine",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    await expireOldLobbies();
    const [member] = await db
      .select()
      .from(lobbyMembersTable)
      .where(eq(lobbyMembersTable.userId, req.user.id));
    if (!member) {
      res.json({ lobby: null });
      return;
    }
    const [lobby] = await db
      .select()
      .from(lobbiesTable)
      .where(eq(lobbiesTable.id, member.lobbyId));
    if (!lobby || lobby.state === "closed") {
      // Cleanup orphan member row
      await db
        .delete(lobbyMembersTable)
        .where(eq(lobbyMembersTable.userId, req.user.id));
      res.json({ lobby: null });
      return;
    }

    // Defensive: if lobby is started and the underlying battle already
    // finished, close the lobby and treat the user as idle so they are
    // not auto-redirected back into the finished battle.
    if (lobby.state === "started" && lobby.battleId) {
      const [battle] = await db
        .select({ state: battlesTable.state })
        .from(battlesTable)
        .where(eq(battlesTable.id, lobby.battleId));
      if (battle && battle.state === "finished") {
        await db
          .update(lobbiesTable)
          .set({ state: "closed" })
          .where(eq(lobbiesTable.id, lobby.id));
        await db
          .delete(lobbyMembersTable)
          .where(eq(lobbyMembersTable.lobbyId, lobby.id));
        res.json({ lobby: null });
        return;
      }
    }

    res.json({ lobby: await serializeLobby(lobby) });
  },
);

// --- Get lobby by code -----------------------------------------------------
router.get(
  "/api/lobbies/:code",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const code = String(req.params.code).toUpperCase();
    const [lobby] = await db
      .select()
      .from(lobbiesTable)
      .where(eq(lobbiesTable.code, code));
    if (!lobby) {
      res.status(404).json({ error: "Лобби олдсонгүй" });
      return;
    }
    res.json(await serializeLobby(lobby));
  },
);

// --- Join lobby ------------------------------------------------------------
router.post(
  "/api/lobbies/:code/join",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const code = String(req.params.code).toUpperCase();
    const [lobby] = await db
      .select()
      .from(lobbiesTable)
      .where(eq(lobbiesTable.code, code));
    if (!lobby) {
      res.status(404).json({ error: "Лобби олдсонгүй" });
      return;
    }
    if (lobby.state !== "open") {
      res.status(409).json({ error: "Лобби нээлттэй биш" });
      return;
    }
    if (new Date(lobby.expiresAt).getTime() < Date.now()) {
      await db
        .update(lobbiesTable)
        .set({ state: "closed" })
        .where(eq(lobbiesTable.id, lobby.id));
      res.status(409).json({ error: "Лоббийн хугацаа дууссан" });
      return;
    }

    // Drop user from any other lobby first
    await db
      .delete(lobbyMembersTable)
      .where(
        and(
          eq(lobbyMembersTable.userId, req.user.id),
          sql`${lobbyMembersTable.lobbyId} <> ${lobby.id}`,
        ),
      );

    const memberRows = await db
      .select()
      .from(lobbyMembersTable)
      .where(eq(lobbyMembersTable.lobbyId, lobby.id));

    const already = memberRows.find((m) => m.userId === req.user!.id);
    if (!already) {
      if (memberRows.length >= lobby.maxPlayers) {
        res.status(409).json({ error: "Лобби дүүрсэн байна" });
        return;
      }
      await db.insert(lobbyMembersTable).values({
        lobbyId: lobby.id,
        userId: req.user.id,
        isHost: 0,
        ready: 0,
      });
    }

    const payload = await broadcastLobby(lobby.id, "lobby:updated");
    res.json(payload);
  },
);

// --- Leave lobby -----------------------------------------------------------
router.post(
  "/api/lobbies/:id/leave",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const [lobby] = await db
      .select()
      .from(lobbiesTable)
      .where(eq(lobbiesTable.id, id));
    if (!lobby) {
      res.status(404).json({ error: "Лобби олдсонгүй" });
      return;
    }

    await db
      .delete(lobbyMembersTable)
      .where(
        and(
          eq(lobbyMembersTable.lobbyId, id),
          eq(lobbyMembersTable.userId, req.user.id),
        ),
      );

    const remaining = await db
      .select()
      .from(lobbyMembersTable)
      .where(eq(lobbyMembersTable.lobbyId, id));

    if (remaining.length === 0) {
      await db
        .update(lobbiesTable)
        .set({ state: "closed" })
        .where(eq(lobbiesTable.id, id));
      emitToUser(req.user.username, "lobby:closed", { id });
      res.json({ ok: true, closed: true });
      return;
    }

    // If host left, promote earliest member
    if (lobby.hostUserId === req.user.id) {
      const [first] = remaining.sort(
        (a, b) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      );
      await db
        .update(lobbiesTable)
        .set({ hostUserId: first.userId })
        .where(eq(lobbiesTable.id, id));
      await db
        .update(lobbyMembersTable)
        .set({ isHost: 1 })
        .where(
          and(
            eq(lobbyMembersTable.lobbyId, id),
            eq(lobbyMembersTable.userId, first.userId),
          ),
        );
    }

    const payload = await broadcastLobby(id, "lobby:updated");
    emitToUser(req.user.username, "lobby:left", { id });
    res.json(payload);
  },
);

// --- Toggle ready ----------------------------------------------------------
router.post(
  "/api/lobbies/:id/ready",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const ready = Boolean(req.body?.ready);

    const [member] = await db
      .select()
      .from(lobbyMembersTable)
      .where(
        and(
          eq(lobbyMembersTable.lobbyId, id),
          eq(lobbyMembersTable.userId, req.user.id),
        ),
      );
    if (!member) {
      res.status(404).json({ error: "Лоббид нэгдээгүй байна" });
      return;
    }
    await db
      .update(lobbyMembersTable)
      .set({ ready: ready ? 1 : 0 })
      .where(
        and(
          eq(lobbyMembersTable.lobbyId, id),
          eq(lobbyMembersTable.userId, req.user.id),
        ),
      );

    const payload = await broadcastLobby(id, "lobby:updated");
    res.json(payload);
  },
);

// --- Start battle (host only) ---------------------------------------------
router.post(
  "/api/lobbies/:id/start",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = String(req.params.id);
    const [lobby] = await db
      .select()
      .from(lobbiesTable)
      .where(eq(lobbiesTable.id, id));
    if (!lobby) {
      res.status(404).json({ error: "Лобби олдсонгүй" });
      return;
    }
    if (lobby.hostUserId !== req.user.id) {
      res.status(403).json({ error: "Зөвхөн хостын эрх" });
      return;
    }
    if (lobby.state !== "open") {
      res.status(409).json({ error: "Лобби нээлттэй биш" });
      return;
    }

    const memberRows = await db
      .select()
      .from(lobbyMembersTable)
      .where(eq(lobbyMembersTable.lobbyId, id));
    if (memberRows.length < 2) {
      res.status(409).json({ error: "Тоглогч хүрэлцэхгүй байна" });
      return;
    }
    if (memberRows.some((m) => m.ready === 0)) {
      res.status(409).json({ error: "Бүх тоглогч бэлэн биш байна" });
      return;
    }

    // Currently we only support 1v1 battles, so take first two members
    const sorted = memberRows.sort(
      (a, b) => (b.isHost === 1 ? 1 : 0) - (a.isHost === 1 ? 1 : 0),
    );
    const [hostMember, oppMember] = sorted;

    const [hostUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, hostMember.userId));
    const [oppUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, oppMember.userId));
    if (!hostUser || !oppUser) {
      res.status(500).json({ error: "Хэрэглэгч олдсонгүй" });
      return;
    }

    const [problem] = await db
      .select({ id: problemsTable.id })
      .from(problemsTable)
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!problem) {
      res.status(500).json({ error: "Дасгал олдсонгүй" });
      return;
    }

    const battleId = crypto.randomUUID();
    await db.insert(battlesTable).values({
      id: battleId,
      problemId: problem.id,
      player1Id: hostUser.id,
      player2Id: oppUser.id,
      state: "in_battle",
      mode: lobby.mode,
      player1EloBefore: hostUser.eloRating,
      player2EloBefore: oppUser.eloRating,
      startedAt: new Date(),
    });
    await ensureReplay(battleId, problem.id, hostUser.id, oppUser.id);

    await db
      .update(lobbiesTable)
      .set({ state: "started", battleId })
      .where(eq(lobbiesTable.id, id));

    // Notify all members
    const fresh = await db
      .select()
      .from(lobbyMembersTable)
      .where(eq(lobbyMembersTable.lobbyId, id));
    for (const m of fresh) {
      const [u] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, m.userId));
      if (u) emitToUser(u.username, "lobby:started", { id, battleId });
    }

    res.json({ battleId });
  },
);

export default router;
