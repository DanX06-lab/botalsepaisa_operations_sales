import { getDb } from "../../lib/mongodb";
import { logger } from "../../lib/logger";

export interface NotificationPayload {
  ticketId: string;
  customerName: string;
  whatsappNumber: string;
  quantity: string;
  weekendBatch: boolean;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  status: string;
  source: string;
}

export class NotificationService {
  /**
   * Queue a notification for operations team.
   * If delivery fails, it remains in the outbox for retries.
   */
  async notifyOperations(payload: NotificationPayload): Promise<void> {
    try {
      const db = getDb();
      
      const outboxEntry = {
        payload,
        createdAt: new Date().toISOString(),
        status: "PENDING",
        retries: 0
      };

      const result = await db.collection("notifications_outbox").insertOne(outboxEntry);
      
      // Simulate attempting to send the notification immediately.
      // If we had a real SMS/Email/Slack API, we would call it here.
      // If it throws, we just log it. The background job will retry later.
      this.simulateSend(outboxEntry)
        .then(async () => {
          await db.collection("notifications_outbox").updateOne(
            { _id: result.insertedId },
            { $set: { status: "DELIVERED", deliveredAt: new Date().toISOString() } }
          );
          logger.info({ ticketId: payload.ticketId }, "Operations notification delivered");
        })
        .catch(async (err) => {
          logger.warn({ err, ticketId: payload.ticketId }, "Failed to deliver operations notification immediately, will retry");
          await db.collection("notifications_outbox").updateOne(
            { _id: result.insertedId },
            { $inc: { retries: 1 } }
          );
        });
        
    } catch (err) {
      // If we fail to even insert into the outbox, we log heavily so we don't drop the pickup
      logger.error({ err, payload }, "CRITICAL: Failed to queue operations notification");
    }
  }

  private async simulateSend(entry: any): Promise<void> {
    // This represents the real notification integration
    logger.info({ notification: entry.payload }, "Sending notification to Operations...");
  }
}

export const notificationService = new NotificationService();
