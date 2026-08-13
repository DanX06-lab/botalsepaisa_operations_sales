import { getDb } from "../lib/mongodb";
import { logger } from "../lib/logger";

export async function setupWhatsAppIndexes() {
  const db = getDb();

  logger.info("Setting up WhatsApp MongoDB indexes...");

  // conversations
  await db.collection("conversations").createIndex(
    { whatsapp_number: 1 },
    { unique: true }
  );
  await db.collection("conversations").createIndex({ updated_at: -1 });

  // pickup_requests
  await db.collection("pickup_requests").createIndex(
    { ticket_id: 1 },
    { unique: true }
  );
  await db.collection("pickup_requests").createIndex({ customer_id: 1 });
  await db.collection("pickup_requests").createIndex({ whatsapp_number: 1 });
  await db.collection("pickup_requests").createIndex({ status: 1 });
  await db.collection("pickup_requests").createIndex({ created_at: -1 });
  await db.collection("pickup_requests").createIndex({ source: 1 });

  // support_requests
  await db.collection("support_requests").createIndex({ customer_id: 1 });
  await db.collection("support_requests").createIndex({ whatsapp_number: 1 });
  await db.collection("support_requests").createIndex({ status: 1 });
  await db.collection("support_requests").createIndex({ created_at: -1 });

  logger.info("WhatsApp MongoDB indexes setup complete.");
}
