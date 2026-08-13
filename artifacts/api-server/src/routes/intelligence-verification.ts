import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /queue
router.get("/queue", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    
    // pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};
    if (req.query.status) filter.verification_status = req.query.status;
    if (req.query.type) filter.business_type = req.query.type;
    if (req.query.zone_id) filter.zone_id = req.query.zone_id;
    if (req.query.area_id) filter.area_id = req.query.area_id;
    if (req.query.ward_id) filter.ward_id = req.query.ward_id;
    if (req.query.borough_id) filter.borough_id = req.query.borough_id;
    if (req.query.source) filter.source = req.query.source;
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } }
      ];
    }

    // Try to sort by review_priority, else last_updated
    const data = await db.collection("intelligence_businesses")
      .find(filter)
      .sort({ verification_status: 1, last_updated: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("intelligence_businesses").countDocuments(filter);

    res.json({
      data,
      total,
      page,
      limit
    });
  } catch (err) {
    logger.error({ error: err }, "Failed to get verification queue");
    res.status(500).json({ error: "Failed to get verification queue" });
  }
});

// GET /{id}/history
router.get("/:id/history", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const history = await db.collection("verification_history")
      .find({ business_id: req.params.id })
      .sort({ changed_at: -1 })
      .toArray();

    res.json(history);
  } catch (err) {
    logger.error({ error: err }, "Failed to get verification history");
    res.status(500).json({ error: "Failed to get verification history" });
  }
});

// POST /{id}/status
router.post("/:id/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { status, note } = req.body;
    
    if (!status) {
      res.status(400).json({ error: "Missing status" });
      return;
    }

    const business = await db.collection("intelligence_businesses").findOne({ id: req.params.id });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const previousStatus = business.verification_status || "UNVERIFIED";

    await db.collection("intelligence_businesses").updateOne(
      { id: req.params.id },
      { 
        $set: { 
          verification_status: status,
          last_verified: new Date().toISOString(),
          last_updated: new Date().toISOString()
        } 
      }
    );

    const historyRecord = {
      id: uuidv4(),
      business_id: req.params.id,
      previous_status: previousStatus,
      new_status: status,
      changed_by: "system", // Should be user, but hardcode for now
      changed_at: new Date().toISOString(),
      reason_note: note || null
    };

    await db.collection("verification_history").insertOne(historyRecord);

    const updated = await db.collection("intelligence_businesses").findOne({ id: req.params.id });
    res.json(updated);
  } catch (err) {
    logger.error({ error: err }, "Failed to update verification status");
    res.status(500).json({ error: "Failed to update verification status" });
  }
});

// POST /bulk-status
router.post("/bulk-status", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { business_ids, status, note } = req.body;

    if (!business_ids || !Array.isArray(business_ids) || !status) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const businesses = await db.collection("intelligence_businesses")
      .find({ id: { $in: business_ids } })
      .toArray();

    const historyRecords = businesses.map(b => ({
      id: uuidv4(),
      business_id: b.id,
      previous_status: b.verification_status || "UNVERIFIED",
      new_status: status,
      changed_by: "system",
      changed_at: new Date().toISOString(),
      reason_note: note || null
    }));

    if (historyRecords.length > 0) {
      await db.collection("verification_history").insertMany(historyRecords);
    }

    await db.collection("intelligence_businesses").updateMany(
      { id: { $in: business_ids } },
      { 
        $set: { 
          verification_status: status,
          last_verified: new Date().toISOString(),
          last_updated: new Date().toISOString()
        } 
      }
    );

    res.json({ success: true, count: businesses.length });
  } catch (err) {
    logger.error({ error: err }, "Failed to bulk update verification status");
    res.status(500).json({ error: "Failed to bulk update verification status" });
  }
});

// POST /{id}/duplicate
router.post("/:id/duplicate", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { target_id, note } = req.body;

    if (!target_id) {
      res.status(400).json({ error: "Missing target_id" });
      return;
    }

    const business = await db.collection("intelligence_businesses").findOne({ id: req.params.id });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const previousStatus = business.verification_status || "UNVERIFIED";

    await db.collection("intelligence_businesses").updateOne(
      { id: req.params.id },
      { 
        $set: { 
          verification_status: "DUPLICATE",
          duplicate_of: target_id,
          last_verified: new Date().toISOString(),
          last_updated: new Date().toISOString()
        } 
      }
    );

    const historyRecord = {
      id: uuidv4(),
      business_id: req.params.id,
      previous_status: previousStatus,
      new_status: "DUPLICATE",
      changed_by: "system",
      changed_at: new Date().toISOString(),
      reason_note: note || `Duplicate of ${target_id}`
    };

    await db.collection("verification_history").insertOne(historyRecord);

    const updated = await db.collection("intelligence_businesses").findOne({ id: req.params.id });
    res.json(updated);
  } catch (err) {
    logger.error({ error: err }, "Failed to mark as duplicate");
    res.status(500).json({ error: "Failed to mark as duplicate" });
  }
});

export const intelligenceVerificationRouter = router;
