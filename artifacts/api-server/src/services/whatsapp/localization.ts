export const translations = {
  en: {
    "welcome": "Welcome to BotalSePaisa ♻️\n\nChoose your preferred language:",
    "menu.main": "How can we help you today?",
    "menu.pickup_request": "Request Pickup",
    "menu.track_pickup": "Track Pending Pickup",
    "menu.customer_support": "Customer Support",
    "pickup.quantity_prompt": "Approximately how many PET bottles do you have?",
    "pickup.qty_10_25": "10–25",
    "pickup.qty_25_50": "25–50",
    "pickup.qty_50_plus": "50+",
    "pickup.weekend_prompt": "Would you like us to include this in the Saturday pickup batch?",
    "pickup.weekend_saturday": "Save for Saturday",
    "pickup.weekend_continue": "Continue Pickup",
    "pickup.location_prompt": "Please share your pickup location 📍",
    "pickup.landmark_prompt": "Is there any nearby landmark that will help our pickup team find you?",
    "pickup.skip_landmark": "Skip this step",
    "pickup.confirmation_summary": "Please confirm your pickup request:\n\n🧴 Bottles: {quantity}\n📍 Location: Received\n🏷 Landmark: {landmark}\n\nReady to request pickup?",
    "pickup.confirm": "Confirm Pickup",
    "pickup.cancel": "Cancel",
    "pickup.confirmed": "🎉 Pickup request confirmed!\n\nTicket ID: {ticket_id}\n\nBottles: {quantity}\nStatus: Pending\nLocation: Received 📍\nLandmark: {landmark}\n\nWe'll update you once your pickup is assigned.",
    "pickup.already_active": "You already have an active pickup request: {ticket_id}.\n\nWould you like to track it?",
    "pickup.no_pending": "You don't currently have a pending pickup request.",
    "pickup.track_info": "Your pickup:\n\n🎟 {ticket_id}\n\nStatus: {status}\nQuantity: {quantity}\nETA: {eta}\n\nWe'll notify you when the pickup is on the way.",
    "support.prompt": "Please describe your issue and our team will help you.",
    "fallback.invalid": "I didn't quite get that. Please select one of the available options or type MENU to return to the main menu.",
    "global.menu": "Returning to main menu..."
  },
  hi: {
    "welcome": "BotalSePaisa ♻️ में आपका स्वागत है\n\nअपनी पसंदीदा भाषा चुनें:",
    "menu.main": "आज हम आपकी कैसे मदद कर सकते हैं?",
    "menu.pickup_request": "पिकअप का अनुरोध करें",
    "menu.track_pickup": "पेंडिंग पिकअप ट्रैक करें",
    "menu.customer_support": "ग्राहक सहायता",
    "pickup.quantity_prompt": "आपके पास लगभग कितनी PET बोतलें हैं?",
    "pickup.qty_10_25": "10–25",
    "pickup.qty_25_50": "25–50",
    "pickup.qty_50_plus": "50+",
    "pickup.weekend_prompt": "क्या आप चाहेंगे कि हम इसे शनिवार के पिकअप बैच में शामिल करें?",
    "pickup.weekend_saturday": "शनिवार के लिए सेव करें",
    "pickup.weekend_continue": "पिकअप जारी रखें",
    "pickup.location_prompt": "कृपया अपना पिकअप स्थान शेयर करें 📍",
    "pickup.landmark_prompt": "क्या कोई आस-पास का लैंडमार्क (Landmark) है जिससे हमारी पिकअप टीम आपको ढूंढ सके?",
    "pickup.skip_landmark": "इस चरण को छोड़ें",
    "pickup.confirmation_summary": "कृपया अपने पिकअप अनुरोध की पुष्टि करें:\n\n🧴 बोतलें: {quantity}\n📍 स्थान: प्राप्त हुआ\n🏷 लैंडमार्क: {landmark}\n\nक्या आप पिकअप अनुरोध करने के लिए तैयार हैं?",
    "pickup.confirm": "पिकअप की पुष्टि करें",
    "pickup.cancel": "रद्द करें",
    "pickup.confirmed": "🎉 पिकअप अनुरोध की पुष्टि हो गई!\n\nटिकट आईडी: {ticket_id}\n\nबोतलें: {quantity}\nस्थिति: पेंडिंग\nस्थान: प्राप्त हुआ 📍\nलैंडमार्क: {landmark}\n\nआपका पिकअप असाइन होने पर हम आपको अपडेट करेंगे।",
    "pickup.already_active": "आपके पास पहले से ही एक सक्रिय पिकअप अनुरोध है: {ticket_id}।\n\nक्या आप इसे ट्रैक करना चाहेंगे?",
    "pickup.no_pending": "वर्तमान में आपका कोई पेंडिंग पिकअप अनुरोध नहीं है।",
    "pickup.track_info": "आपका पिकअप:\n\n🎟 {ticket_id}\n\nस्थिति: {status}\nमात्रा: {quantity}\nETA: {eta}\n\nपिकअप रास्ते में होने पर हम आपको सूचित करेंगे।",
    "support.prompt": "कृपया अपनी समस्या का वर्णन करें और हमारी टीम आपकी मदद करेगी।",
    "fallback.invalid": "मुझे वह समझ नहीं आया। कृपया उपलब्ध विकल्पों में से किसी एक को चुनें या मुख्य मेनू पर लौटने के लिए MENU टाइप करें।",
    "global.menu": "मुख्य मेनू पर लौट रहे हैं..."
  }
};

export type LanguageCode = keyof typeof translations;

export function t(key: keyof typeof translations["en"], lang: string, params: Record<string, string> = {}): string {
  const language = (translations as any)[lang] ? lang : "en";
  let text = (translations as any)[language][key] || (translations as any)["en"][key];
  
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v || "None");
  }
  
  return text;
}
