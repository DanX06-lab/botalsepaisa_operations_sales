import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";
import * as turf from "@turf/turf";

const router = Router();

router.post("/intelligence/discovery/sync", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    
    // Using simple bounding box for Kolkata
    const query = `[out:json];(node["amenity"="cafe"](22.45,88.25,22.75,88.50);node["amenity"="restaurant"](22.45,88.25,22.75,88.50););out body;`;
    
    const url = "https://overpass-api.de/api/interpreter";
    
    logger.info("Calling Overpass API for discovery sync");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const nodes = data.elements || [];
    
    const stats = {
      records_discovered: nodes.length,
      new_records: 0,
      updated_records: 0,
      duplicates: 0,
      invalid_records: 0,
      errors: 0
    };

    const businessesCollection = db.collection("intelligence_businesses");
    const polygonsCollection = db.collection("geographic_polygons");
    const historyCollection = db.collection("sync_history");

    const polygons = await polygonsCollection.find({}).toArray();

    for (const node of nodes) {
      try {
        if (node.type !== "node" || !node.lat || !node.lon || !node.tags) {
          stats.invalid_records++;
          continue;
        }

        const lat = node.lat;
        const lng = node.lon;
        
        // Normalization
        const name = node.tags.name || "Unknown Business";
        const normalizedName = name.toLowerCase().trim();
        const businessType = node.tags.amenity || "unknown";
        const phone = node.tags.phone || node.tags["contact:phone"] || null;
        const website = node.tags.website || node.tags["contact:website"] || null;
        const sourceId = node.id.toString();

        // Geographic Assignment
        const point = turf.point([lng, lat]);
        let zoneId = null;
        
        for (const polygon of polygons) {
          if (polygon.geometry && polygon.zone_id) {
            try {
              if (turf.booleanPointInPolygon(point, polygon.geometry)) {
                zoneId = polygon.zone_id;
                break;
              }
            } catch (e) {
              // Ignore invalid polygons
            }
          }
        }
        
        // Check if exists
        const existing = await businessesCollection.findOne({ source: "osm", source_id: sourceId });
        
        if (existing) {
          // Update
          await businessesCollection.updateOne(
            { _id: existing._id },
            {
              $set: {
                name,
                normalized_name: normalizedName,
                business_type: businessType,
                phone,
                website,
                latitude: lat,
                longitude: lng,
                location: {
                  type: "Point",
                  coordinates: [lng, lat]
                },
                zone_id: zoneId,
                updated_at: new Date().toISOString()
              }
            }
          );
          stats.updated_records++;
        } else {
          // Insert
          const businessId = uuidv4();
          await businessesCollection.insertOne({
            id: businessId,
            name,
            normalized_name: normalizedName,
            business_type: businessType,
            phone,
            website,
            latitude: lat,
            longitude: lng,
            location: {
              type: "Point",
              coordinates: [lng, lat]
            },
            zone_id: zoneId,
            source: "osm",
            source_id: sourceId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          stats.new_records++;
        }
      } catch (e) {
        logger.error({ error: e, nodeId: node.id }, "Error processing OSM node");
        stats.errors++;
      }
    }

    const historyRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...stats
    };

    await historyCollection.insertOne(historyRecord);

    res.json({
      message: "Discovery sync completed",
      history: historyRecord
    });

  } catch (error) {
    logger.error({ error }, "Failed to sync discovery");
    res.status(500).json({ error: "Failed to sync discovery" });
  }
});

router.get("/intelligence/discovery/history", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const historyCollection = db.collection("sync_history");
    const history = await historyCollection.find({}).sort({ timestamp: -1 }).toArray();
    
    const mappedHistory = history.map(h => ({
      id: h.id,
      timestamp: h.timestamp,
      records_discovered: h.records_discovered,
      new_records: h.new_records,
      updated_records: h.updated_records,
      duplicates: h.duplicates,
      invalid_records: h.invalid_records,
      errors: h.errors
    }));
    
    res.json(mappedHistory);
  } catch (error) {
    logger.error({ error }, "Failed to fetch discovery history");
    res.status(500).json({ error: "Failed to fetch discovery history" });
  }
});

export default router;
