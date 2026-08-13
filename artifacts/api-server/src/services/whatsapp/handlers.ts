import { getDb } from "../../lib/mongodb";
import { whatsappService } from "./whatsapp_service";
import { pickupService } from "./pickup_service";
import { t } from "./localization";
import { logger } from "../../lib/logger";

export async function handleLanguageSelection(whatsappNumber: string, payload: any) {
  // If user says Hi or anything else, send Language selection
  await whatsappService.sendButtons(
    whatsappNumber,
    t("welcome", "en"),
    [
      { id: "language_en", title: "English" },
      { id: "language_hi", title: "हिन्दी" },
      { id: "language_bn", title: "বাংলা" }
    ]
  );
  return { nextState: "LANGUAGE_SELECTION" };
}

export async function handleLanguageResponse(whatsappNumber: string, payload: any, session: any) {
  const buttonId = payload?.interactive?.button_reply?.id;
  
  if (buttonId === "language_en") {
    session.language = "en";
    await sendMainMenu(whatsappNumber, session.language);
    return { nextState: "MAIN_MENU", session };
  } else if (buttonId === "language_hi") {
    session.language = "hi";
    await whatsappService.sendButtons(whatsappNumber, "लिपि चुनें (Select Script):", [
      { id: "script_hi_devanagari", title: "हिंदी" },
      { id: "script_hi_hinglish", title: "Hinglish" }
    ]);
    return { nextState: "SCRIPT_PREF_HI", session };
  } else if (buttonId === "language_bn") {
    session.language = "bn";
    await whatsappService.sendButtons(whatsappNumber, "লিপি নির্বাচন করুন (Select Script):", [
      { id: "script_bn_bengali", title: "বাংলা" },
      { id: "script_bn_banglish", title: "Banglish" }
    ]);
    return { nextState: "SCRIPT_PREF_BN", session };
  }

  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", session.language || "en"));
  return { nextState: "LANGUAGE_SELECTION", session };
}

export async function handleScriptResponse(whatsappNumber: string, payload: any, session: any) {
  const buttonId = payload?.interactive?.button_reply?.id;
  
  if (buttonId?.startsWith("script_")) {
    session.script_preference = buttonId;
    await sendMainMenu(whatsappNumber, session.language);
    return { nextState: "MAIN_MENU", session };
  }
  
  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", session.language));
  return { nextState: session.current_state, session };
}

export async function sendMainMenu(whatsappNumber: string, lang: string) {
  await whatsappService.sendButtons(
    whatsappNumber,
    t("menu.main", lang),
    [
      { id: "pickup_request", title: t("menu.pickup_request", lang) },
      { id: "track_pickup", title: t("menu.track_pickup", lang) },
      { id: "customer_support", title: t("menu.customer_support", lang) }
    ]
  );
}

export async function handleMainMenu(whatsappNumber: string, payload: any, session: any) {
  const buttonId = payload?.interactive?.button_reply?.id;
  const lang = session.language;

  if (buttonId === "pickup_request") {
    const activePickup = await pickupService.getActivePickup(whatsappNumber);
    if (activePickup) {
      await whatsappService.sendText(whatsappNumber, t("pickup.already_active", lang, { ticket_id: activePickup.ticket_id }));
      return { nextState: "MAIN_MENU", session };
    }

    await whatsappService.sendButtons(whatsappNumber, t("pickup.quantity_prompt", lang), [
      { id: "quantity_10_25", title: t("pickup.qty_10_25", lang) },
      { id: "quantity_25_50", title: t("pickup.qty_25_50", lang) },
      { id: "quantity_50_plus", title: t("pickup.qty_50_plus", lang) }
    ]);
    return { nextState: "QUANTITY_SELECT", session };
  }
  
  if (buttonId === "track_pickup") {
    const activePickup = await pickupService.getActivePickup(whatsappNumber);
    if (activePickup) {
      await whatsappService.sendText(whatsappNumber, t("pickup.track_info", lang, {
        ticket_id: activePickup.ticket_id,
        status: activePickup.status,
        quantity: activePickup.quantity_range,
        eta: activePickup.eta || "TBD"
      }));
    } else {
      await whatsappService.sendText(whatsappNumber, t("pickup.no_pending", lang));
    }
    await sendMainMenu(whatsappNumber, lang);
    return { nextState: "MAIN_MENU", session };
  }

  if (buttonId === "customer_support") {
    await whatsappService.sendText(whatsappNumber, t("support.prompt", lang));
    return { nextState: "CUSTOMER_SUPPORT", session };
  }

  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", lang));
  return { nextState: "MAIN_MENU", session };
}

export async function handleQuantitySelect(whatsappNumber: string, payload: any, session: any) {
  const buttonId = payload?.interactive?.button_reply?.id;
  const lang = session.language;

  if (buttonId?.startsWith("quantity_")) {
    session.quantity_range = buttonId.replace("quantity_", "").replace("_plus", "+").replace("_", "-");
    
    if (buttonId === "quantity_10_25") {
      await whatsappService.sendButtons(whatsappNumber, t("pickup.weekend_prompt", lang), [
        { id: "weekend_saturday", title: t("pickup.weekend_saturday", lang) },
        { id: "weekend_continue", title: t("pickup.weekend_continue", lang) }
      ]);
      return { nextState: "WEEKEND_BATCH", session };
    } else {
      await whatsappService.sendLocationRequest(whatsappNumber, t("pickup.location_prompt", lang));
      return { nextState: "LOCATION_CAPTURE", session };
    }
  }

  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", lang));
  return { nextState: "QUANTITY_SELECT", session };
}

export async function handleWeekendBatch(whatsappNumber: string, payload: any, session: any) {
  const buttonId = payload?.interactive?.button_reply?.id;
  const lang = session.language;

  if (buttonId === "weekend_saturday") {
    session.weekend_batch = true;
    await whatsappService.sendLocationRequest(whatsappNumber, t("pickup.location_prompt", lang));
    return { nextState: "LOCATION_CAPTURE", session };
  } else if (buttonId === "weekend_continue") {
    session.weekend_batch = false;
    await whatsappService.sendLocationRequest(whatsappNumber, t("pickup.location_prompt", lang));
    return { nextState: "LOCATION_CAPTURE", session };
  }

  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", lang));
  return { nextState: "WEEKEND_BATCH", session };
}

export async function handleLocationCapture(whatsappNumber: string, payload: any, session: any) {
  const lang = session.language;
  const location = payload?.location;

  if (location && location.latitude && location.longitude) {
    session.latitude = location.latitude;
    session.longitude = location.longitude;

    await whatsappService.sendButtons(whatsappNumber, t("pickup.landmark_prompt", lang), [
      { id: "skip_landmark", title: t("pickup.skip_landmark", lang) }
    ]);
    return { nextState: "LANDMARK_PROMPT", session };
  }

  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", lang));
  await whatsappService.sendLocationRequest(whatsappNumber, t("pickup.location_prompt", lang));
  return { nextState: "LOCATION_CAPTURE", session };
}

export async function handleLandmarkPrompt(whatsappNumber: string, payload: any, session: any) {
  const lang = session.language;
  const buttonId = payload?.interactive?.button_reply?.id;
  const text = payload?.text?.body;

  if (buttonId === "skip_landmark") {
    session.landmark = null;
  } else if (text) {
    session.landmark = text;
  } else {
    await whatsappService.sendText(whatsappNumber, t("fallback.invalid", lang));
    return { nextState: "LANDMARK_PROMPT", session };
  }

  await whatsappService.sendButtons(
    whatsappNumber, 
    t("pickup.confirmation_summary", lang, { quantity: session.quantity_range, landmark: session.landmark || "None" }),
    [
      { id: "confirm_pickup", title: t("pickup.confirm", lang) },
      { id: "cancel_pickup", title: t("pickup.cancel", lang) }
    ]
  );

  return { nextState: "CONFIRMATION", session };
}

export async function handleConfirmation(whatsappNumber: string, payload: any, session: any) {
  const lang = session.language;
  const buttonId = payload?.interactive?.button_reply?.id;

  if (buttonId === "confirm_pickup") {
    try {
      const pickup = await pickupService.createPickup(session);
      await whatsappService.sendText(whatsappNumber, t("pickup.confirmed", lang, {
        ticket_id: pickup.ticket_id,
        quantity: pickup.quantity_range,
        landmark: pickup.landmark || "None"
      }));
    } catch (err: any) {
      logger.error({ err, session }, "Failed to create pickup");
      await whatsappService.sendText(whatsappNumber, "Sorry, there was an error processing your request. Please try again later.");
    }
    await sendMainMenu(whatsappNumber, lang);
    return { nextState: "MAIN_MENU", session };
  } else if (buttonId === "cancel_pickup") {
    await whatsappService.sendText(whatsappNumber, t("global.menu", lang));
    await sendMainMenu(whatsappNumber, lang);
    return { nextState: "MAIN_MENU", session };
  }

  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", lang));
  return { nextState: "CONFIRMATION", session };
}

export async function handleCustomerSupport(whatsappNumber: string, payload: any, session: any) {
  const lang = session.language;
  const text = payload?.text?.body;

  if (text) {
    const db = getDb();
    await db.collection("support_requests").insertOne({
      whatsapp_number: whatsappNumber,
      message: text,
      status: "OPEN",
      created_at: new Date().toISOString()
    });
    
    await whatsappService.sendText(whatsappNumber, "Your message has been received. Our team will contact you shortly.");
    await sendMainMenu(whatsappNumber, lang);
    return { nextState: "MAIN_MENU", session };
  }

  await whatsappService.sendText(whatsappNumber, t("fallback.invalid", lang));
  return { nextState: "CUSTOMER_SUPPORT", session };
}
