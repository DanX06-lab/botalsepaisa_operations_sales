import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { ObjectId } from "mongodb";
import * as turf from "@turf/turf";

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
// PUT /intelligence/businesses/:id
router.put("/intelligence/businesses/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const data = req.body;
    const businessId = req.params.id;

    const existingBusiness = await db.collection("intelligence_businesses").findOne({ id: businessId });
    if (!existingBusiness) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, id, created_at, ...updateFields } = data;
    const updatedBusiness: any = { ...updateFields, updated_at: new Date().toISOString() };
    
    // Check if location changed
    if (data.latitude !== undefined && data.longitude !== undefined) {
      if (data.latitude !== existingBusiness.latitude || data.longitude !== existingBusiness.longitude) {
        updatedBusiness.location = {
          type: "Point",
          coordinates: [data.longitude, data.latitude]
        };

        const polygons = await db.collection("geographic_polygons").find({}).toArray();
        const point = turf.point([data.longitude, data.latitude]);
        
        let zoneId = null;
        let areaId = null;
        let boroughId = null;
        let wardId = null;

        for (const polygon of polygons) {
          if (polygon.geometry) {
            try {
              if (turf.booleanPointInPolygon(point, polygon.geometry)) {
                if (polygon.zone_id) zoneId = polygon.zone_id;
                if (polygon.area_id) areaId = polygon.area_id;
                if (polygon.borough_id) boroughId = polygon.borough_id;
                if (polygon.ward_id) wardId = polygon.ward_id;
              }
            } catch (e) {
              // Ignore
            }
          }
        }

        updatedBusiness.zone_id = zoneId;
        updatedBusiness.area_id = areaId;
        updatedBusiness.borough_id = boroughId;
        updatedBusiness.ward_id = wardId;
      }
    }

    await db.collection("intelligence_businesses").updateOne(
      { id: businessId },
      { $set: updatedBusiness }
    );

    const result = await db.collection("intelligence_businesses").findOne({ id: businessId });
    res.json(result);
  } catch (err) {
    logger.error({ error: err }, "Failed to update intelligence business");
    res.status(500).json({ error: "Failed to update intelligence business" });
  }
});

export default router;
