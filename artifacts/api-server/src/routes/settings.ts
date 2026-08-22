import { Router, type IRouter } from "express";
import { getDb } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/settings", async (_req, res): Promise<void> => {
  const db = getDb();
  let setting = await db.collection("settings").findOne({ id: 1 });
  if (!setting) {
    await db.collection("settings").insertOne({ id: 1, pricePerKg: 12 });
    setting = { id: 1, pricePerKg: 12 } as any;
  }
  res.json(setting);
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { pricePerKg, homeLatitude, homeLongitude } = parsed.data;
  
  const updateData: Record<string, unknown> = { pricePerKg };
  
  if (homeLatitude !== undefined) {
    if (homeLatitude !== null && (homeLatitude < -90 || homeLatitude > 90)) {
      res.status(400).json({ error: "Latitude must be between -90 and 90" });
      return;
    }
    updateData.homeLatitude = homeLatitude;
  }
  
  if (homeLongitude !== undefined) {
    if (homeLongitude !== null && (homeLongitude < -180 || homeLongitude > 180)) {
      res.status(400).json({ error: "Longitude must be between -180 and 180" });
      return;
    }
    updateData.homeLongitude = homeLongitude;
  }

  const db = getDb();
  const result = await db.collection("settings").findOneAndUpdate(
    { id: 1 },
    { $set: updateData },
    { upsert: true, returnDocument: "after" }
  );

  const setting = result || { id: 1, pricePerKg };
  req.log.info({ pricePerKg: setting.pricePerKg, homeLatitude: setting.homeLatitude, homeLongitude: setting.homeLongitude }, "Settings updated");
  res.json(setting);
});

export default router;
