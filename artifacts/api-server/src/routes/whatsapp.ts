import { Router, type IRouter } from "express";
import crypto from "crypto";
import { conversationStateService } from "../services/whatsapp/state_machine";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Middleware to verify Meta WhatsApp webhook signature
function verifyMetaSignature(req: any, res: any, next: any) {
  // If no secret configured, skip verification (e.g. for local dev/testing)
  const appSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!appSecret) {
    logger.warn("WHATSAPP_WEBHOOK_SECRET is not set, skipping signature verification.");
    return next();
  }

  const signature = req.headers["x-hub-signature-256"];
  if (!signature) {
    logger.warn("Missing x-hub-signature-256 header");
    return res.status(403).send("Missing signature");
  }

  if (!req.rawBody) {
    logger.error("req.rawBody is missing, cannot verify signature");
    return res.status(500).send("Server configuration error");
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(req.rawBody)
    .digest("hex")}`;

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return next();
  } else {
    logger.warn("Invalid WhatsApp Webhook signature");
    return res.status(403).send("Invalid signature");
  }
}

// Webhook Verification (GET)
router.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "botal_se_paisa_verify";

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, "Failed WhatsApp webhook verification");
    res.sendStatus(403);
  }
});

// Incoming Events (POST)
router.post("/whatsapp/webhook", verifyMetaSignature, async (req, res) => {
  try {
    const body = req.body;
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              const whatsappNumber = message.from;
              const messageId = message.id;
              
              // Only process supported message types
              if (message.type === "text" || message.type === "interactive" || message.type === "location") {
                // We send this to background processing instead of awaiting it
                // so we can quickly ack the webhook and prevent Meta from retrying
                conversationStateService.processMessage(whatsappNumber, messageId, message)
                  .catch(err => logger.error({ err, whatsappNumber, messageId }, "Error processing WhatsApp message"));
              } else {
                 logger.warn({ type: message.type }, "Received unsupported message type");
              }
            }
          }
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err: any) {
    logger.error({ err }, "Webhook error");
    res.sendStatus(500);
  }
});

export default router;
