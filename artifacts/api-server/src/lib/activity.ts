import { db, activityFeedTable, notificationsTable } from "@workspace/db";

export async function pushActivity(
  userId: number,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.insert(activityFeedTable).values({ userId, type, payload });
}

export async function pushNotification(
  userId: number,
  type: string,
  title: string,
  body?: string | null,
  link?: string | null,
): Promise<void> {
  await db.insert(notificationsTable).values({
    userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
  });
}
