import { getDb } from "../../lib/mongodb";
import { logger } from "../../lib/logger";
import { ObjectId } from "mongodb";
import { notificationService } from "../notifications/notification_service";

export class PickupService {
  /**
   * Generates a unique ticket ID in format BSP-YYMMDD-XXXX
   */
  async generateTicketId(): Promise<string> {
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const prefix = `BSP-${yy}${mm}${dd}-`;

    const db = getDb();
    
    const result = await db.collection("ticket_sequences").findOneAndUpdate(
      { _id: prefix as any },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );

    const nextNumber = result?.seq || 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Checks if a user already has a pending or in-progress pickup
   */
  async getActivePickup(whatsappNumber: string) {
    const db = getDb();
    return await db.collection("pickup_requests").findOne({
      whatsapp_number: whatsappNumber,
      status: { $in: ["PENDING", "ASSIGNED", "PICKUP_IN_PROGRESS"] }
    });
  }

  /**
   * Creates a new pickup request in MongoDB
   */
  async createPickup(sessionData: any): Promise<any> {
    const db = getDb();
    
    const activePickup = await this.getActivePickup(sessionData.whatsapp_number);
    if (activePickup) {
      throw new Error(`Active pickup already exists: ${activePickup.ticket_id}`);
    }

    const ticketId = await this.generateTicketId();
    const now = new Date().toISOString();

    const pickupDoc = {
      ticket_id: ticketId,
      customer_id: sessionData.customer_id || null,
      whatsapp_number: sessionData.whatsapp_number,
      customer_name: sessionData.customer_name || "WhatsApp User",
      language: sessionData.language || "en",
      script_preference: sessionData.script_preference || null,
      quantity_range: sessionData.quantity_range,
      weekend_batch: sessionData.weekend_batch || false,
      latitude: sessionData.latitude,
      longitude: sessionData.longitude,
      landmark: sessionData.landmark || null,
      status: "PENDING",
      eta: null,
      assigned_to: null,
      source: "whatsapp",
      created_at: now,
      updated_at: now,
      completed_at: null,
      cancelled_at: null
    };

    const result = await db.collection("pickup_requests").insertOne(pickupDoc);
    
    logger.info({ ticketId, whatsappNumber: sessionData.whatsapp_number }, "Created new pickup request");

    // Operations notification logic could go here
    // Fire and forget notification
    notificationService.notifyOperations({
      ticketId,
      customerName: pickupDoc.customer_name,
      whatsappNumber: pickupDoc.whatsapp_number,
      quantity: pickupDoc.quantity_range,
      weekendBatch: pickupDoc.weekend_batch,
      latitude: pickupDoc.latitude,
      longitude: pickupDoc.longitude,
      landmark: pickupDoc.landmark,
      status: "PENDING",
      source: "whatsapp"
    });

    return { ...pickupDoc, _id: result.insertedId.toString() };
  }

  async updatePickupStatus(id: string, status: string, eta?: string, assignedTo?: string) {
    const db = getDb();
    const now = new Date().toISOString();
    
    const updates: any = { status, updated_at: now };
    if (eta !== undefined) updates.eta = eta;
    if (assignedTo !== undefined) updates.assigned_to = assignedTo;

    if (status === "COMPLETED") updates.completed_at = now;
    if (status === "CANCELLED") updates.cancelled_at = now;

    const result = await db.collection("pickup_requests").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("Pickup not found");
    }

    // Check if status changed and we need to notify WhatsApp Customer Service
    // This connects to the requirement: "when an operator changes PENDING -> ASSIGNED you can automatically send Notification"
    return result;
  }
}

export const pickupService = new PickupService();
