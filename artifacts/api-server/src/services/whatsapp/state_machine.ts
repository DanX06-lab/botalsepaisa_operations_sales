import { getDb } from "../../lib/mongodb";
import { whatsappService } from "./whatsapp_service";
import { logger } from "../../lib/logger";
import {
  handleLanguageSelection,
  handleLanguageResponse,
  handleScriptResponse,
  handleMainMenu,
  handleQuantitySelect,
  handleWeekendBatch,
  handleLocationCapture,
  handleLandmarkPrompt,
  handleConfirmation,
  handleCustomerSupport
} from "./handlers";

export class ConversationStateService {
  private async getSession(whatsappNumber: string): Promise<any> {
    const db = getDb();
    let session: any = await db.collection("conversations").findOne({ whatsapp_number: whatsappNumber });
    
    if (!session) {
      session = {
        whatsapp_number: whatsappNumber,
        current_state: "LANGUAGE_SELECTION",
        language: "en",
        script_preference: null,
        session_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.collection("conversations").insertOne(session);
    }
    return session;
  }

  private async updateSession(whatsappNumber: string, updates: any) {
    const db = getDb();
    await db.collection("conversations").updateOne(
      { whatsapp_number: whatsappNumber },
      { 
        $set: { 
          ...updates, 
          updated_at: new Date().toISOString() 
        } 
      }
    );
  }

  async processMessage(whatsappNumber: string, messageId: string, payload: any) {
    // Basic idempotency check
    const db = getDb();
    const existing = await db.collection("conversations").findOne({ last_message_id: messageId });
    if (existing) {
      logger.info({ messageId }, "Message already processed, skipping.");
      return;
    }

    const session = await this.getSession(whatsappNumber);
    const text = payload?.text?.body?.toLowerCase();
    
    // Global fallback / restart
    if (text === "hi" || text === "hello" || text === "menu" || text === "cancel") {
      if (text === "hi" || text === "hello") {
        session.current_state = "LANGUAGE_SELECTION";
      } else {
        session.current_state = "MAIN_MENU";
      }
    }

    let result;
    try {
      switch (session.current_state) {
        case "LANGUAGE_SELECTION":
          result = await handleLanguageSelection(whatsappNumber, payload);
          break;
        case "SCRIPT_PREF_HI":
        case "SCRIPT_PREF_BN":
          result = await handleScriptResponse(whatsappNumber, payload, session);
          break;
        case "MAIN_MENU":
          // Re-route if they sent a text response in LANGUAGE_SELECTION somehow
          if (!session.language && payload?.interactive) {
             result = await handleLanguageResponse(whatsappNumber, payload, session);
          } else if (payload?.interactive?.button_reply) {
            result = await handleMainMenu(whatsappNumber, payload, session);
          } else {
             // they typed menu
             result = await handleMainMenu(whatsappNumber, {interactive: {button_reply: {id: "menu_prompt"}}}, session);
          }
          break;
        case "QUANTITY_SELECT":
          result = await handleQuantitySelect(whatsappNumber, payload, session);
          break;
        case "WEEKEND_BATCH":
          result = await handleWeekendBatch(whatsappNumber, payload, session);
          break;
        case "LOCATION_CAPTURE":
          result = await handleLocationCapture(whatsappNumber, payload, session);
          break;
        case "LANDMARK_PROMPT":
          result = await handleLandmarkPrompt(whatsappNumber, payload, session);
          break;
        case "CONFIRMATION":
          result = await handleConfirmation(whatsappNumber, payload, session);
          break;
        case "CUSTOMER_SUPPORT":
          result = await handleCustomerSupport(whatsappNumber, payload, session);
          break;
        default:
          result = await handleLanguageResponse(whatsappNumber, payload, session);
      }
    } catch (err: any) {
      logger.error({ err, session }, "Error in state machine");
      await whatsappService.sendText(whatsappNumber, "An error occurred. Please type 'menu' to start over.");
      result = { nextState: "MAIN_MENU", session };
    }

    const nextState = (result as any)?.nextState || session.current_state;
    const updatedSessionData = (result as any)?.session || session;

    await this.updateSession(whatsappNumber, {
      current_state: nextState,
      language: updatedSessionData.language,
      script_preference: updatedSessionData.script_preference,
      session_data: {
        quantity_range: updatedSessionData.quantity_range,
        weekend_batch: updatedSessionData.weekend_batch,
        latitude: updatedSessionData.latitude,
        longitude: updatedSessionData.longitude,
        landmark: updatedSessionData.landmark
      },
      last_message_id: messageId,
      last_message_timestamp: new Date().toISOString()
    });

    if (messageId) {
      await whatsappService.markAsRead(messageId).catch(err => {
         logger.error({ err, messageId }, "Failed to mark message as read");
      });
    }
  }
}

export const conversationStateService = new ConversationStateService();
