import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";

type NotifType = "reaction" | "reply" | "event_join" | "nearby_event" | "chat_message";
type RefType = "message" | "event" | "conversation";

export async function createNotification(
  userId: number,
  type: NotifType,
  content: string,
  referenceId?: number,
  referenceType?: RefType,
) {
  try {
    await db.insert(notificationsTable).values({
      userId,
      type,
      content,
      referenceId: referenceId ?? null,
      referenceType: referenceType ?? null,
    });
  } catch {}
}
