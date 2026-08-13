import { Router, type IRouter } from "express";
import { getDb } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";
import { pickupService } from "../services/whatsapp/pickup_service";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/pickups", async (req, res): Promise<void> => {
  const { status, page = "1", limit = "20" } = req.query;

  const db = getDb();
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  
  const [data, total] = await Promise.all([
    db.collection("pickup_requests")
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    db.collection("pickup_requests").countDocuments(filter),
  ]);

  res.json({
    data,
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

router.patch("/pickups/:id/status", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, eta, assigned_to } = req.body;

    if (!status) {
      res.status(400).json({ error: "Status is required" });
      return;
    }

    const updated = await pickupService.updatePickupStatus(id, status, eta, assigned_to);
    res.json(updated.value);
  } catch (err: any) {
    if (err.message === "Pickup not found") {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
