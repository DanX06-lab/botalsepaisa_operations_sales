import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";
import * as turf from "@turf/turf";

const router = Router();

router.post("/intelligence/import/preview", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { rows, filename } = req.body as { rows: any[]; filename: string };

    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ error: "Invalid rows data" });
      return;
    }
    
    const stats = {
      total: rows.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      missingCoords: 0,
      unassignedZones: 0,
      cafes: 0,
      restaurants: 0,
    };

    const annotatedRows = [];
    
    // Fetch geographic polygons for assignment
    const polygonsCollection = db.collection("geographic_polygons");
    const polygons = await polygonsCollection.find({}).toArray();

    // Fetch existing businesses to detect duplicates
    const businessesCollection = db.collection("intelligence_businesses");
    const existingBusinesses = await businessesCollection.find({}).project({ normalized_name: 1 }).toArray();
    const existingNames = new Set(existingBusinesses.map(b => b.normalized_name));

    for (const row of rows) {
      const annotatedRow = { ...row, errors: [] as string[], duplicate: false, zone_id: "Unassigned" };
      let isValid = true;

      // Validate coords
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lng)) {
        annotatedRow.errors.push("Missing or invalid coordinates");
        stats.missingCoords++;
        isValid = false;
      } else {
        // Geographic Assignment
        const point = turf.point([lng, lat]);
        let assigned = false;
        for (const polygon of polygons) {
          if (polygon.geometry && polygon.zone_id) {
            try {
              if (turf.booleanPointInPolygon(point, polygon.geometry)) {
                annotatedRow.zone_id = polygon.zone_id;
                assigned = true;
                break;
              }
            } catch (e) {
              // Ignore invalid polygons
            }
          }
        }
        if (!assigned) {
          stats.unassignedZones++;
        }
      }

      // Name Normalization & Duplicate Detection
      if (!row.name) {
        annotatedRow.errors.push("Missing name");
        isValid = false;
      } else {
        const normalizedName = String(row.name).toLowerCase().trim();
        annotatedRow.normalized_name = normalizedName;
        if (existingNames.has(normalizedName)) {
          annotatedRow.duplicate = true;
          stats.duplicates++;
          isValid = false;
        }
      }

      // Track types
      const type = String(row.business_type || "").toLowerCase();
      if (type.includes("cafe")) stats.cafes++;
      if (type.includes("restaurant")) stats.restaurants++;

      if (isValid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }

      annotatedRows.push(annotatedRow);
    }

    res.json({ stats, rows: annotatedRows });
  } catch (error) {
    logger.error({ error }, "Failed to preview import");
    res.status(500).json({ error: "Failed to preview import" });
  }
});

router.post("/intelligence/import/confirm", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { rows, filename } = req.body as { rows: any[]; filename: string };

    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ error: "Invalid rows data" });
      return;
    }

    const businessesCollection = db.collection("intelligence_businesses");
    const historyCollection = db.collection("import_history");

    // Recalculate stats for history log
    const stats = {
      total: rows.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      missingCoords: 0,
      unassignedZones: 0,
      cafes: 0,
      restaurants: 0,
    };

    const validRowsToInsert = [];
    for (const row of rows) {
      if (row.duplicate || (row.errors && row.errors.length > 0)) {
        stats.invalid++;
        if (row.duplicate) stats.duplicates++;
        if (row.errors && row.errors.includes("Missing or invalid coordinates")) stats.missingCoords++;
        continue;
      }

      stats.valid++;
      if (row.zone_id === "Unassigned") stats.unassignedZones++;
      const type = String(row.business_type || "").toLowerCase();
      if (type.includes("cafe")) stats.cafes++;
      if (type.includes("restaurant")) stats.restaurants++;

      const businessId = uuidv4();
      const newBusiness = {
        id: businessId,
        name: row.name,
        normalized_name: row.normalized_name,
        business_type: row.business_type,
        address: row.address,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        location: {
          type: "Point",
          coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
        },
        zone_id: row.zone_id !== "Unassigned" ? row.zone_id : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "CSV_IMPORT",
        source_id: filename
      };

      validRowsToInsert.push(newBusiness);
    }

    if (validRowsToInsert.length > 0) {
      await businessesCollection.insertMany(validRowsToInsert);
    }

    const historyRecord = {
      id: uuidv4(),
      filename,
      stats,
      importedAt: new Date().toISOString()
    };
    await historyCollection.insertOne(historyRecord);

    res.json(historyRecord);
  } catch (error) {
    logger.error({ error }, "Failed to confirm import");
    res.status(500).json({ error: "Failed to confirm import" });
  }
});

router.get("/intelligence/import/history", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const historyCollection = db.collection("import_history");
    const history = await historyCollection.find({}).sort({ importedAt: -1 }).toArray();
    const mappedHistory = history.map(h => ({
      id: h.id,
      filename: h.filename,
      stats: h.stats,
      importedAt: h.importedAt
    }));
    res.json(mappedHistory);
  } catch (error) {
    logger.error({ error }, "Failed to fetch import history");
    res.status(500).json({ error: "Failed to fetch import history" });
  }
});

export default router;
