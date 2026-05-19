import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "codesteppe-dev-secret";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(test, "hex"),
    );
  } catch {
    return false;
  }
}

export function generateToken(): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(crypto.randomBytes(32))
    .digest("hex");
}

export interface AuthedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

export async function userFromToken(token: string): Promise<User | null> {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));
  if (!session) return null;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));
  return user ?? null;
}

export async function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Шаардлагатай" });
    return;
  }
  const token = header.slice(7);
  const user = await userFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Хүчингүй сесс" });
    return;
  }
  req.user = user;
  req.sessionToken = token;
  next();
}

export async function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const user = await userFromToken(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  }
  next();
}
