import { Router } from "express";
import { getDb } from "../lib/mongodb";

const router = Router();

const getGlobalFilters = (req: any) => {
  const match: any = {};
  if (req.query.zone_id) match.zone_id = req.query.zone_id;
  if (req.query.area_id) match.area_id = req.query.area_id;
  if (req.query.ward_id) match.ward_id = req.query.ward_id;
  if (req.query.borough_id) match.borough_id = req.query.borough_id;
  if (req.query.business_type) match.business_type = req.query.business_type;
  if (req.query.verification_status) match.verification_status = req.query.verification_status;
  if (req.query.source) match.source = req.query.source;
  return match;
};

router.get("/overview", async (req, res) => {
  try {
    const db = getDb();
    const match = getGlobalFilters(req);
    
    const result = await db.collection("intelligence_businesses").aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cafes: { $sum: { $cond: [{ $eq: ["$business_type", "cafe"] }, 1, 0] } },
          restaurants: { $sum: { $cond: [{ $eq: ["$business_type", "restaurant"] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ["$verification_status", "verified"] }, 1, 0] } },
          unverified: { $sum: { $cond: [{ $eq: ["$verification_status", "unverified"] }, 1, 0] } },
          duplicates: { $sum: { $cond: [{ $eq: ["$verification_status", "duplicate"] }, 1, 0] } },
          unassigned: { $sum: { $cond: [{ $eq: ["$zone_id", null] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    if (result.length > 0) {
      const { _id, ...stats } = result[0];
      res.json(stats);
    } else {
      res.json({ total: 0, cafes: 0, restaurants: 0, verified: 0, unverified: 0, duplicates: 0, unassigned: 0 });
    }
  } catch (error) {
    console.error("Error in coverage overview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/zones", async (req, res) => {
  try {
    const db = getDb();
    const match = getGlobalFilters(req);
    
    const result = await db.collection("intelligence_businesses").aggregate([
      { $match: match },
      {
        $group: {
          _id: "$zone_id",
          total: { $sum: 1 },
          cafes: { $sum: { $cond: [{ $eq: ["$business_type", "cafe"] }, 1, 0] } },
          restaurants: { $sum: { $cond: [{ $eq: ["$business_type", "restaurant"] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ["$verification_status", "verified"] }, 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          zone_id: "$_id",
          total: 1,
          cafes: 1,
          restaurants: 1,
          verified: 1
        }
      }
    ]).toArray();
    
    res.json(result);
  } catch (error) {
    console.error("Error in zone coverage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/areas", async (req, res) => {
  try {
    const db = getDb();
    const match = getGlobalFilters(req);
    
    const result = await db.collection("intelligence_businesses").aggregate([
      { $match: match },
      {
        $group: {
          _id: { area_id: "$area_id", zone_id: "$zone_id" },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          area_id: "$_id.area_id",
          zone_id: "$_id.zone_id",
          total: 1
        }
      }
    ]).toArray();
    
    res.json(result);
  } catch (error) {
    console.error("Error in area coverage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/wards", async (req, res) => {
  try {
    const db = getDb();
    const match = getGlobalFilters(req);
    
    const result = await db.collection("intelligence_businesses").aggregate([
      { $match: match },
      {
        $group: {
          _id: { ward_id: "$ward_id", borough_id: "$borough_id" },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          ward_id: "$_id.ward_id",
          borough_id: "$_id.borough_id",
          total: 1
        }
      }
    ]).toArray();
    
    res.json(result);
  } catch (error) {
    console.error("Error in ward coverage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/boroughs", async (req, res) => {
  try {
    const db = getDb();
    const match = getGlobalFilters(req);
    
    const result = await db.collection("intelligence_businesses").aggregate([
      { $match: match },
      {
        $group: {
          _id: "$borough_id",
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          borough_id: "$_id",
          total: 1
        }
      }
    ]).toArray();
    
    res.json(result);
  } catch (error) {
    console.error("Error in borough coverage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sources", async (req, res) => {
  try {
    const db = getDb();
    const match = getGlobalFilters(req);
    
    const result = await db.collection("intelligence_businesses").aggregate([
      { $match: match },
      {
        $group: {
          _id: "$source",
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          source: "$_id",
          total: 1
        }
      }
    ]).toArray();
    
    res.json(result);
  } catch (error) {
    console.error("Error in source coverage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quality", async (req, res) => {
  try {
    const db = getDb();
    const match = getGlobalFilters(req);
    
    const result = await db.collection("intelligence_businesses").aggregate([
      { $match: match },
      {
        $facet: {
          missing_coordinates: [
            { $match: { location: { $type: "null" } } },
            { $count: "count" }
          ],
          missing_address: [
            { $match: { address: { $in: [null, ""] } } },
            { $count: "count" }
          ],
          missing_phone: [
            { $match: { phone: { $in: [null, ""] } } },
            { $count: "count" }
          ],
          missing_website: [
            { $match: { website: { $in: [null, ""] } } },
            { $count: "count" }
          ],
          missing_rating: [
            { $match: { rating: null } },
            { $count: "count" }
          ],
          unassigned_zone_area: [
            { $match: { $or: [{ zone_id: null }, { area_id: null }] } },
            { $count: "count" }
          ]
        }
      }
    ]).toArray();
    
    const stats = result[0];
    const quality = {
      missing_coordinates: stats.missing_coordinates[0]?.count || 0,
      missing_address: stats.missing_address[0]?.count || 0,
      missing_phone: stats.missing_phone[0]?.count || 0,
      missing_website: stats.missing_website[0]?.count || 0,
      missing_rating: stats.missing_rating[0]?.count || 0,
      unassigned_zone_area: stats.unassigned_zone_area[0]?.count || 0
    };
    
    res.json(quality);
  } catch (error) {
    console.error("Error in quality coverage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const intelligenceCoverageRouter = router;
