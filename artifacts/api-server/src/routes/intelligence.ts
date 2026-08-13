import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { ObjectId } from "mongodb";

const router = Router();

// GET /intelligence/businesses
router.get("/intelligence/businesses", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    
    // Parse query params for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const businesses = await db.collection("intelligence_businesses")
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json(businesses);
  } catch (err) {
    logger.error({ error: err }, "Failed to list intelligence businesses");
    res.status(500).json({ error: "Failed to list intelligence businesses" });
  }
});

// POST /intelligence/businesses
router.post("/intelligence/businesses", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const data = req.body;

    if (!data.name || !data.business_type || !data.address) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const newBusiness = {
      ...data,
      id: data.id || uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (data.latitude && data.longitude) {
      newBusiness.location = {
        type: "Point",
        coordinates: [data.longitude, data.latitude]
      };
    }

    await db.collection("intelligence_businesses").insertOne(newBusiness);

    res.status(201).json(newBusiness);
  } catch (err) {
    logger.error({ error: err }, "Failed to create intelligence business");
    res.status(500).json({ error: "Failed to create intelligence business" });
  }
});

export default router;
