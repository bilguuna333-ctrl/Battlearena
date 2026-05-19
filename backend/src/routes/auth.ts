import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { OAuth2Client } from "google-auth-library";
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
import { sendVerificationEmail } from "../lib/email";

const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);
const router: IRouter = Router();

function toCurrentUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarSeed: u.avatarSeed,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    email: u.email,
    eloRating: u.eloRating,
    highestElo: u.highestElo,
    xp: u.xp,
    coins: u.coins,
    language: u.language,
    title: u.title,
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

router.post("/api/auth/register", async (req, res): Promise<void> => {
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

router.post("/api/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Буруу мэдээлэл" });
    return;
  }
  const usernameOrEmail = parsed.data.username.toLowerCase();
  
  // Allow login with either username or email
  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      or(
        eq(usersTable.username, usernameOrEmail),
        eq(usersTable.email, usernameOrEmail)
      )
    );
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Имэйл/нэр эсвэл нууц үг буруу" });
    return;
  }
  const token = generateToken();
  await db.insert(sessionsTable).values({ userId: user.id, token });
  res.json({ token, user: toCurrentUser(user) });
});

router.post("/api/auth/google", async (req, res): Promise<void> => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ error: "No credential provided" });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid Google payload" });
      return;
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || "Google User";
    const picture = payload.picture;

    // Check if user exists by email
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      // Create new user. Username might be taken if we just use email prefix.
      let baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (baseUsername.length < 3) baseUsername += "user";
      
      let finalUsername = baseUsername;
      let counter = 1;
      while (true) {
        const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, finalUsername));
        if (!existing) break;
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      const [newUser] = await db
        .insert(usersTable)
        .values({
          username: finalUsername,
          displayName: name,
          email: email,
          passwordHash: hashPassword(randomPassword),
          avatarUrl: picture,
          avatarSeed: finalUsername,
        })
        .returning();
      user = newUser;
    } else if (user.avatarUrl !== picture) {
      // Update the picture if it changed
      await db.update(usersTable).set({ avatarUrl: picture }).where(eq(usersTable.id, user.id));
      user.avatarUrl = picture;
    }

    const token = generateToken();
    await db.insert(sessionsTable).values({ userId: user.id, token });
    res.json({ token, user: toCurrentUser(user) });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Google login failed" });
  }
});

router.post(
  "/api/auth/logout",
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
  "/api/auth/me",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    res.json(toCurrentUser(req.user));
  },
);

router.post(
  "/api/me/language",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const lang = String(req.body?.language ?? "");
    if (lang !== "mn" && lang !== "en") {
      res.status(400).json({ error: "Буруу хэл" });
      return;
    }
    await db
      .update(usersTable)
      .set({ language: lang })
      .where(eq(usersTable.id, req.user.id));
    res.json({ ok: true });
  },
);

router.post(
  "/api/me/profile",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const avatarSeed = typeof req.body?.avatarSeed === "string" ? req.body.avatarSeed : undefined;
    const avatarUrl = typeof req.body?.avatarUrl === "string" ? req.body.avatarUrl : undefined;
    const bio = typeof req.body?.bio === "string" ? req.body.bio : undefined;
    
    if (avatarSeed !== undefined || avatarUrl !== undefined || bio !== undefined) {
      const updates: any = {};
      if (avatarSeed !== undefined) updates.avatarSeed = avatarSeed;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (bio !== undefined) updates.bio = bio;
      
      await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, req.user.id));
    }
    
    res.json({ ok: true });
  },
);

// In-memory store for verification codes (in production, use Redis or DB)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

// Send verification code to email
router.post("/api/auth/send-verification", async (req, res): Promise<void> => {
  const email = req.body?.email;
  const code = req.body?.code;
  
  if (!email || !code) {
    res.status(400).json({ error: "Email болон код шаардлагатай" });
    return;
  }

  // Store the code with 10 minute expiration
  verificationCodes.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Send email with verification code
  const emailSent = await sendVerificationEmail(email, code);
  
  res.json({ ok: true, emailSent });
});

// Verify email code
router.post("/api/auth/verify-code", async (req, res): Promise<void> => {
  const email = req.body?.email?.toLowerCase();
  const code = req.body?.code;
  
  if (!email || !code) {
    res.status(400).json({ error: "Email болон код шаардлагатай" });
    return;
  }

  const stored = verificationCodes.get(email);
  if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
    res.status(400).json({ error: "Буруу эсвэл хугацаа дууссан код" });
    return;
  }

  // Code is valid - clean up
  verificationCodes.delete(email);
  res.json({ ok: true, verified: true });
});

// Set email after registration
router.post(
  "/api/auth/set-email",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    
    const email = req.body?.email?.toLowerCase();
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email шаардлагатай" });
      return;
    }

    // Check if email is already used by another user
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    
    if (existing && existing.id !== req.user.id) {
      res.status(400).json({ error: "Энэ имэйл аль хэдийн ашиглагдсан" });
      return;
    }

    await db
      .update(usersTable)
      .set({ email })
      .where(eq(usersTable.id, req.user.id));
    
    res.json({ ok: true });
  }
);

export default router;
