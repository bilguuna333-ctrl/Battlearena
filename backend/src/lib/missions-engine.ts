import { and, eq } from "drizzle-orm";
import { db, missionsTable, userMissionsTable } from "@workspace/db";
import { periodKey } from "./periods";

export type MissionEventType =
  | "problem_solved"
  | "battle_win"
  | "boss_defeated"
  | "submission_correct_streak";

export interface MissionEventInput {
  userId: number;
  type: MissionEventType;
  difficulty?: string;
  amount?: number;
}

interface GoalParams {
  difficulty?: string;
  streak?: number;
}

function matches(goalType: string, params: GoalParams, ev: MissionEventInput) {
  switch (goalType) {
    case "solve_any":
      return ev.type === "problem_solved";
    case "solve_difficulty":
      return ev.type === "problem_solved" && ev.difficulty === params.difficulty;
    case "battle_win":
      return ev.type === "battle_win";
    case "boss_defeated":
      return ev.type === "boss_defeated";
    case "submission_streak":
      return (
        ev.type === "submission_correct_streak" &&
        (ev.amount ?? 0) >= (params.streak ?? 5)
      );
    default:
      return false;
  }
}

export async function applyMissionEvent(ev: MissionEventInput): Promise<void> {
  const missions = await db.select().from(missionsTable);
  for (const m of missions) {
    let params: GoalParams = {};
    if (m.goalParams) {
      try {
        params = JSON.parse(m.goalParams) as GoalParams;
      } catch {
        params = {};
      }
    }
    if (!matches(m.goalType, params, ev)) continue;
    const key = periodKey(m.period);
    const [existing] = await db
      .select()
      .from(userMissionsTable)
      .where(
        and(
          eq(userMissionsTable.userId, ev.userId),
          eq(userMissionsTable.missionId, m.id),
          eq(userMissionsTable.periodKey, key),
        ),
      );
    if (existing) {
      if (existing.progress >= m.goalCount) continue;
      const newProgress = Math.min(existing.progress + 1, m.goalCount);
      await db
        .update(userMissionsTable)
        .set({ progress: newProgress, updatedAt: new Date() })
        .where(eq(userMissionsTable.id, existing.id));
    } else {
      await db
        .insert(userMissionsTable)
        .values({
          userId: ev.userId,
          missionId: m.id,
          periodKey: key,
          progress: 1,
        })
        .onConflictDoNothing();
    }
  }
}
