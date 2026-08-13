import { logger } from "../../lib/logger";

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface WhatsAppProvider {
  sendText(to: string, text: string): Promise<void>;
  sendButtons(to: string, text: string, buttons: InteractiveButton[]): Promise<void>;
  sendLocationRequest(to: string, text: string): Promise<void>;
  markAsRead(messageId: string): Promise<void>;
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  private token: string;
  private phoneNumberId: string;
  private baseUrl = "https://graph.facebook.com/v17.0";

  constructor() {
    this.token = process.env.WHATSAPP_ACCESS_TOKEN || "";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  }

  private async request(endpoint: string, payload: any) {
    if (!this.token || !this.phoneNumberId) {
      logger.warn("WhatsApp credentials not configured, skipping API call");
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/${endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        logger.error({ data }, "WhatsApp API Error");
        throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      logger.error({ error }, "Failed to send WhatsApp message");
      throw error;
    }
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.request("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text }
    });
  }

  async sendButtons(to: string, text: string, buttons: InteractiveButton[]): Promise<void> {
    await this.request("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: {
          buttons: buttons.map(b => ({
            type: "reply",
            reply: { id: b.id, title: b.title.substring(0, 20) } // Max 20 chars
          }))
        }
      }
    });
  }

  async sendLocationRequest(to: string, text: string): Promise<void> {
    await this.request("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "location_request_message",
        body: { text },
        action: {
          name: "send_location"
        }
      }
    });
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.request("messages", {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId
    });
  }
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendText(to: string, text: string): Promise<void> {
    logger.info({ to, text }, "MOCK WHATSAPP: Sending Text");
  }

  async sendButtons(to: string, text: string, buttons: InteractiveButton[]): Promise<void> {
    logger.info({ to, text, buttons }, "MOCK WHATSAPP: Sending Buttons");
  }

  async sendLocationRequest(to: string, text: string): Promise<void> {
    logger.info({ to, text }, "MOCK WHATSAPP: Requesting Location");
  }

  async markAsRead(messageId: string): Promise<void> {
    logger.info({ messageId }, "MOCK WHATSAPP: Marking as read");
  }
}

// Export a configured singleton
export const whatsappService = process.env.NODE_ENV === "production"
  ? new MetaWhatsAppProvider()
  : (process.env.WHATSAPP_MOCK === "false" ? new MetaWhatsAppProvider() : new MockWhatsAppProvider());
