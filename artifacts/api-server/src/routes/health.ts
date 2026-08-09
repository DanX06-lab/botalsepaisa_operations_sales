import { Router, type IRouter } from "express";
import { getDb } from "../lib/mongodb";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    const db = getDb();
    await db.command({ ping: 1 });
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (error) {
    res.status(503).json({ status: "error", error: "MongoDB unavailable" });
  }
});

export default router;
