import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authMiddleware,
  type AuthedRequest,
} from "../lib/auth";
import { rankFromElo } from "../lib/elo";

const router: IRouter = Router();

function toCurrentUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarSeed: u.avatarSeed,
    bio: u.bio,
    eloRating: u.eloRating,
    highestElo: u.highestElo,
    xp: u.xp,
    battleWins: u.battleWins,
    battleLosses: u.battleLosses,
    battleDraws: u.battleDraws,
    winStreak: u.winStreak,
    rank: rankFromElo(u.eloRating),
    highestRank: u.highestRank,
    favoriteLanguage: u.favoriteLanguage,
    createdAt: u.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Буруу мэдээлэл" });
    return;
  }
  const { username, displayName, password, favoriteLanguage } = parsed.data;
  const cleanUsername = username.toLowerCase();
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, cleanUsername));
  if (existing) {
    res.status(400).json({ error: "Энэ нэр аль хэдийн ашиглагдсан" });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({
      username: cleanUsername,
      displayName,
      passwordHash: hashPassword(password),
      favoriteLanguage: favoriteLanguage ?? null,
      avatarSeed: cleanUsername,
    })
    .returning();
  const token = generateToken();
  await db.insert(sessionsTable).values({ userId: user.id, token });
  res.json({ token, user: toCurrentUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Буруу мэдээлэл" });
    return;
  }
  const username = parsed.data.username.toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Нэр эсвэл нууц үг буруу" });
    return;
  }
  const token = generateToken();
  await db.insert(sessionsTable).values({ userId: user.id, token });
  res.json({ token, user: toCurrentUser(user) });
});

router.post(
  "/auth/logout",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (req.sessionToken) {
      await db
        .delete(sessionsTable)
        .where(eq(sessionsTable.token, req.sessionToken));
    }
    res.json({ ok: true });
  },
);

router.get(
  "/auth/me",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    res.json(toCurrentUser(req.user));
  },
);

export default router;
