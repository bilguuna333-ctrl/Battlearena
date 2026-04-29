import { eq } from "drizzle-orm";
import { db, replaysTable } from "@workspace/db";

export type ReplayEventType = "code" | "submission" | "chat" | "finish";

export interface ReplayEventPayload {
  t: number;
  type: ReplayEventType;
  userId: number;
  code?: string;
  passed?: number;
  total?: number;
  message?: string;
}

export async function ensureReplay(
  battleId: string,
  problemId: number,
  player1Id: number,
  player2Id: number,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(replaysTable)
    .where(eq(replaysTable.battleId, battleId));
  if (existing) return;
  await db.insert(replaysTable).values({
    battleId,
    problemId,
    player1Id,
    player2Id,
    durationMs: 0,
    events: [],
  });
}

export async function recordReplayEvent(
  battleId: string,
  startedAt: Date,
  ev: Omit<ReplayEventPayload, "t">,
): Promise<void> {
  const [row] = await db
    .select()
    .from(replaysTable)
    .where(eq(replaysTable.battleId, battleId));
  if (!row) return;
  const t = Date.now() - new Date(startedAt).getTime();
  const events = Array.isArray(row.events)
    ? (row.events as ReplayEventPayload[])
    : [];
  // For 'code' events, deduplicate consecutive identical snapshots from same user
  if (ev.type === "code" && events.length) {
    const last = events[events.length - 1];
    if (
      last.type === "code" &&
      last.userId === ev.userId &&
      last.code === ev.code
    ) {
      return;
    }
  }
  events.push({ ...ev, t });
  await db
    .update(replaysTable)
    .set({ events, durationMs: t })
    .where(eq(replaysTable.battleId, battleId));
}
