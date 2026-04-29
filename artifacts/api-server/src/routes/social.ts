import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  followsTable,
  friendsTable,
  activityFeedTable,
  notificationsTable,
  messagesTable,
  usersTable,
} from "@workspace/db";
import { z } from "zod";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { rankFromElo } from "../lib/elo";
import { pushNotification } from "../lib/activity";

const router: IRouter = Router();

const UserTarget = z.object({ username: z.string().min(1) });
const SendMessage = z.object({
  toUsername: z.string().min(1),
  body: z.string().min(1).max(1000),
});

async function findUser(username: string) {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()));
  return u ?? null;
}

router.get(
  "/social/feed",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const scope = String(req.query.scope ?? "global");
    let userIds: number[] | null = null;
    if (scope === "following") {
      const follows = await db
        .select()
        .from(followsTable)
        .where(eq(followsTable.followerId, req.user.id));
      userIds = follows.map((f) => f.followingId);
      userIds.push(req.user.id);
      if (userIds.length === 0) {
        res.json([]);
        return;
      }
    }
    const baseQuery = db
      .select({
        id: activityFeedTable.id,
        userId: activityFeedTable.userId,
        type: activityFeedTable.type,
        payload: activityFeedTable.payload,
        createdAt: activityFeedTable.createdAt,
      })
      .from(activityFeedTable)
      .orderBy(desc(activityFeedTable.createdAt))
      .limit(50);
    const rows = userIds
      ? await baseQuery.where(inArray(activityFeedTable.userId, userIds))
      : await baseQuery;
    const userMap = new Map<number, { username: string; displayName: string; avatarSeed: string | null }>();
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.userId)));
      const users = await db
        .select()
        .from(usersTable)
        .where(inArray(usersTable.id, ids));
      for (const u of users)
        userMap.set(u.id, { username: u.username, displayName: u.displayName, avatarSeed: u.avatarSeed });
    }
    res.json(
      rows.map((r) => {
        const u = userMap.get(r.userId);
        return {
          id: r.id,
          username: u?.username ?? "?",
          displayName: u?.displayName ?? "?",
          avatarSeed: u?.avatarSeed ?? null,
          type: r.type,
          payload: r.payload,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    );
  },
);

router.post(
  "/social/follow",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = UserTarget.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const target = await findUser(parsed.data.username);
    if (!target || target.id === req.user.id) {
      res.status(404).json({ error: "Тоглогч олдсонгүй" });
      return;
    }
    await db
      .insert(followsTable)
      .values({ followerId: req.user.id, followingId: target.id })
      .onConflictDoNothing();
    await pushNotification(
      target.id,
      "new_follower",
      `${req.user.displayName} танийг дагалаа`,
      null,
      `/u/${req.user.username}`,
    );
    res.json({ ok: true });
  },
);

router.post(
  "/social/unfollow",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = UserTarget.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const target = await findUser(parsed.data.username);
    if (!target) {
      res.status(404).json({ error: "Тоглогч олдсонгүй" });
      return;
    }
    await db
      .delete(followsTable)
      .where(
        and(
          eq(followsTable.followerId, req.user.id),
          eq(followsTable.followingId, target.id),
        ),
      );
    res.json({ ok: true });
  },
);

router.get(
  "/social/friends",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const me = req.user.id;
    const rows = await db
      .select()
      .from(friendsTable)
      .where(or(eq(friendsTable.userId, me), eq(friendsTable.friendId, me)));
    const otherIds = new Set<number>();
    for (const r of rows) {
      otherIds.add(r.userId === me ? r.friendId : r.userId);
    }
    const users = otherIds.size
      ? await db
          .select()
          .from(usersTable)
          .where(inArray(usersTable.id, Array.from(otherIds)))
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const toEntry = (id: number) => {
      const u = userById.get(id);
      if (!u) return null;
      return {
        username: u.username,
        displayName: u.displayName,
        avatarSeed: u.avatarSeed,
        eloRating: u.eloRating,
        rank: rankFromElo(u.eloRating),
        title: u.title,
      };
    };
    const friends: ReturnType<typeof toEntry>[] = [];
    const incoming: ReturnType<typeof toEntry>[] = [];
    const outgoing: ReturnType<typeof toEntry>[] = [];
    for (const r of rows) {
      const otherId = r.userId === me ? r.friendId : r.userId;
      const entry = toEntry(otherId);
      if (!entry) continue;
      if (r.state === "accepted") friends.push(entry);
      else if (r.state === "pending") {
        if (r.userId === me) outgoing.push(entry);
        else incoming.push(entry);
      }
    }
    res.json({
      friends: friends.filter(Boolean),
      incoming: incoming.filter(Boolean),
      outgoing: outgoing.filter(Boolean),
    });
  },
);

router.post(
  "/social/friends/request",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = UserTarget.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const target = await findUser(parsed.data.username);
    if (!target || target.id === req.user.id) {
      res.status(404).json({ error: "Тоглогч олдсонгүй" });
      return;
    }
    const me = req.user.id;
    const [existing] = await db
      .select()
      .from(friendsTable)
      .where(
        or(
          and(eq(friendsTable.userId, me), eq(friendsTable.friendId, target.id)),
          and(eq(friendsTable.userId, target.id), eq(friendsTable.friendId, me)),
        ),
      );
    if (existing) {
      // If they already requested us, auto-accept
      if (existing.userId === target.id && existing.state === "pending") {
        await db
          .update(friendsTable)
          .set({ state: "accepted" })
          .where(eq(friendsTable.id, existing.id));
        await pushNotification(
          target.id,
          "friend_accepted",
          `${req.user.displayName} танийг найз болголоо`,
          null,
          `/u/${req.user.username}`,
        );
      }
      res.json({ ok: true });
      return;
    }
    await db.insert(friendsTable).values({
      userId: me,
      friendId: target.id,
      state: "pending",
    });
    await pushNotification(
      target.id,
      "friend_request",
      `${req.user.displayName} танийг найз болохыг хүссэн`,
      null,
      `/social`,
    );
    res.json({ ok: true });
  },
);

router.post(
  "/social/friends/accept",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = UserTarget.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const target = await findUser(parsed.data.username);
    if (!target) {
      res.status(404).json({ error: "Тоглогч олдсонгүй" });
      return;
    }
    const [pending] = await db
      .select()
      .from(friendsTable)
      .where(
        and(
          eq(friendsTable.userId, target.id),
          eq(friendsTable.friendId, req.user.id),
          eq(friendsTable.state, "pending"),
        ),
      );
    if (!pending) {
      res.status(404).json({ error: "Хүсэлт олдсонгүй" });
      return;
    }
    await db
      .update(friendsTable)
      .set({ state: "accepted" })
      .where(eq(friendsTable.id, pending.id));
    await pushNotification(
      target.id,
      "friend_accepted",
      `${req.user.displayName} танийг найз болголоо`,
      null,
      `/u/${req.user.username}`,
    );
    res.json({ ok: true });
  },
);

router.get(
  "/social/messages/:username",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const other = await findUser(String(req.params.username));
    if (!other) {
      res.status(404).json({ error: "Тоглогч олдсонгүй" });
      return;
    }
    const rows = await db
      .select()
      .from(messagesTable)
      .where(
        or(
          and(
            eq(messagesTable.fromUserId, req.user.id),
            eq(messagesTable.toUserId, other.id),
          ),
          and(
            eq(messagesTable.fromUserId, other.id),
            eq(messagesTable.toUserId, req.user.id),
          ),
        ),
      )
      .orderBy(messagesTable.createdAt)
      .limit(200);
    // Mark unread as read
    await db
      .update(messagesTable)
      .set({ read: 1 })
      .where(
        and(
          eq(messagesTable.fromUserId, other.id),
          eq(messagesTable.toUserId, req.user.id),
          eq(messagesTable.read, 0),
        ),
      );
    res.json(
      rows.map((r) => ({
        id: r.id,
        fromUsername: r.fromUserId === req.user!.id ? req.user!.username : other.username,
        toUsername: r.toUserId === req.user!.id ? req.user!.username : other.username,
        body: r.body,
        mine: r.fromUserId === req.user!.id,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/social/messages/send",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = SendMessage.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const target = await findUser(parsed.data.toUsername);
    if (!target || target.id === req.user.id) {
      res.status(404).json({ error: "Тоглогч олдсонгүй" });
      return;
    }
    const [row] = await db
      .insert(messagesTable)
      .values({
        fromUserId: req.user.id,
        toUserId: target.id,
        body: parsed.data.body,
      })
      .returning();
    await pushNotification(
      target.id,
      "new_message",
      `${req.user.displayName}: ${parsed.data.body.slice(0, 60)}`,
      null,
      `/social/messages/${req.user.username}`,
    );
    res.json({
      id: row.id,
      fromUsername: req.user.username,
      toUsername: target.username,
      body: row.body,
      mine: true,
      createdAt: row.createdAt.toISOString(),
    });
  },
);

router.get(
  "/social/notifications",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.link,
        read: r.read === 1,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/social/notifications/read-all",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    await db
      .update(notificationsTable)
      .set({ read: 1 })
      .where(
        and(
          eq(notificationsTable.userId, req.user.id),
          eq(notificationsTable.read, 0),
        ),
      );
    res.json({ ok: true });
  },
);

// Suppress unused import warning
void sql;

export default router;
