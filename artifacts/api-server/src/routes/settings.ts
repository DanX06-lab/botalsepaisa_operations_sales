import { Router, type IRouter } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/settings", async (_req, res): Promise<void> => {
  let setting = await prisma.setting.findFirst();
  if (!setting) {
    setting = await prisma.setting.create({ data: { pricePerKg: 12 } });
  }
  res.json(setting);
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let setting = await prisma.setting.findFirst();
  if (!setting) {
    setting = await prisma.setting.create({
      data: { pricePerKg: parsed.data.pricePerKg },
    });
  } else {
    setting = await prisma.setting.update({
      where: { id: setting.id },
      data: { pricePerKg: parsed.data.pricePerKg },
    });
  }

  req.log.info({ pricePerKg: setting.pricePerKg }, "Settings updated");
  res.json(setting);
});

export default router;
