import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";
import * as turf from "@turf/turf";

const router = Router();

// Shared pipeline: validates, normalizes, deduplicates, and geo-assigns rows
async function runPipeline(rows: any[], filename: string) {
  const db = getDb();

  // Fetch geographic polygons once
  const polygons = await db.collection("geographic_polygons").find({}).toArray();

  // Fetch existing normalized names AND source_ids for duplicate detection
  const existing = await db
    .collection("intelligence_businesses")
    .find({}, { projection: { normalized_name: 1, source_id: 1 } })
    .toArray();
  const existingNames = new Set(existing.map((b) => b.normalized_name).filter(Boolean));
  const existingSourceIds = new Set(existing.map((b) => b.source_id).filter(Boolean));

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

  for (const row of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let _status: "valid" | "duplicate" | "invalid" | "missing_coords" = "valid";

    // --- Normalization ---
    const name = row.name ? String(row.name).trim() : "";
    const normalized_name = name.toLowerCase();
    const rawType = String(row.business_type || "").toLowerCase().trim();
    const business_type = rawType.includes("restaurant")
      ? "restaurant"
      : rawType.includes("cafe") || rawType.includes("café") || rawType.includes("coffee")
      ? "cafe"
      : rawType || "unknown";

    const address = row.address ? String(row.address).trim() : "";
    const phone = row.phone ? String(row.phone).trim() : "";
    const website = row.website ? String(row.website).trim() : "";
    const rating = row.rating ? parseFloat(row.rating) : null;
    const review_count = row.review_count ? parseInt(row.review_count) : null;
    const price_range = row.price_range ? String(row.price_range).trim() : "";
    const cuisine = row.cuisine
      ? String(row.cuisine).split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];
    const opening_hours = row.opening_hours ? String(row.opening_hours).trim() : "";
    const source = row.source ? String(row.source).trim() : "csv_import";
    const source_id = row.source_id ? String(row.source_id).trim() : null;
    const source_url = row.source_url ? String(row.source_url).trim() : null;

    // --- Validation: Required fields ---
    if (!name) {
      errors.push("Missing name");
    }
    if (!address) {
      warnings.push("Missing address");
    }
    if (!phone) {
      warnings.push("Missing phone");
    }

    // --- Coordinate validation ---
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    const hasValidCoords =
      !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

    if (!hasValidCoords) {
      errors.push("Missing or invalid coordinates");
      stats.missingCoords++;
    }

    // --- Duplicate detection ---
    const isDuplicate =
      (normalized_name && existingNames.has(normalized_name)) ||
      (source_id && existingSourceIds.has(source_id));

    if (isDuplicate) {
      stats.duplicates++;
    }

    // --- Geographic assignment ---
    let zone_id: string | null = null;
    let area_id: string | null = null;
    let ward_id: string | null = null;
    let borough_id: string | null = null;

    if (hasValidCoords) {
      const point = turf.point([lng, lat]);
      for (const polygon of polygons) {
        if (polygon.geometry) {
          try {
            if (turf.booleanPointInPolygon(point, polygon.geometry)) {
              zone_id = polygon.zone_id || null;
              area_id = polygon.area_id || null;
              ward_id = polygon.ward_id || null;
              borough_id = polygon.borough_id || null;
              break;
            }
          } catch {
            // skip malformed polygon
          }
        }
      }
      if (!zone_id) {
        stats.unassignedZones++;
      }
    }

    // --- Status assignment ---
    if (errors.length > 0 && errors.some((e) => e !== "Missing or invalid coordinates")) {
      _status = "invalid";
      stats.invalid++;
    } else if (errors.includes("Missing or invalid coordinates") && errors.length === 1) {
      _status = "missing_coords";
      stats.invalid++;
    } else if (isDuplicate) {
      _status = "duplicate";
    } else {
      _status = "valid";
      stats.valid++;
    }

    // --- Business type count ---
    if (business_type === "cafe") stats.cafes++;
    if (business_type === "restaurant") stats.restaurants++;

    annotatedRows.push({
      _original: row,
      _status,
      errors,
      warnings,
      // Normalized fields
      name,
      normalized_name,
      business_type,
      address,
      phone,
      website,
      rating: isNaN(rating as number) ? null : rating,
      review_count: isNaN(review_count as number) ? null : review_count,
      price_range,
      cuisine,
      opening_hours,
      latitude: hasValidCoords ? lat : null,
      longitude: hasValidCoords ? lng : null,
      zone_id,
      area_id,
      ward_id,
      borough_id,
      source,
      source_id,
      source_url,
    });
  }

  return { stats, rows: annotatedRows };
}

// POST /intelligence/import/preview
router.post("/intelligence/import/preview", async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows, filename } = req.body as { rows: any[]; filename: string };

    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ error: "Invalid rows data" });
      return;
    }

    if (rows.length > 5000) {
      res.status(400).json({ error: "Maximum 5000 rows per import. Please split your file." });
      return;
    }

    const result = await runPipeline(rows, filename);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Failed to preview import");
    res.status(500).json({ error: "Failed to preview import" });
  }
});

// POST /intelligence/import/confirm
router.post("/intelligence/import/confirm", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { rows, filename } = req.body as { rows: any[]; filename: string };

    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ error: "Invalid rows data" });
      return;
    }

    // Re-run the pipeline to guarantee safety (never trust client-side status)
    const { stats, rows: annotatedRows } = await runPipeline(rows, filename);

    const businessesCollection = db.collection("intelligence_businesses");
    let inserted = 0;
    let updated = 0;

    for (const row of annotatedRows) {
      if (row._status !== "valid") continue;

      const businessDoc = {
        name: row.name,
        normalized_name: row.normalized_name,
        business_type: row.business_type,
        address: row.address,
        phone: row.phone || null,
        website: row.website || null,
        rating: row.rating,
        review_count: row.review_count,
        price_range: row.price_range || null,
        cuisine: row.cuisine,
        opening_hours: row.opening_hours || null,
        latitude: row.latitude,
        longitude: row.longitude,
        location:
          row.latitude && row.longitude
            ? { type: "Point", coordinates: [row.longitude, row.latitude] }
            : null,
        zone_id: row.zone_id,
        area_id: row.area_id,
        ward_id: row.ward_id,
        borough_id: row.borough_id,
        source: row.source,
        source_id: row.source_id,
        source_url: row.source_url,
        verification_status: "unverified",
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert key: prefer source_id, fallback to normalized_name
      const upsertKey = row.source_id
        ? { source_id: row.source_id }
        : { normalized_name: row.normalized_name };

      const result = await businessesCollection.updateOne(
        upsertKey,
        {
          $set: businessDoc,
          $setOnInsert: {
            id: uuidv4(),
            created_at: new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;
    }

    const historyRecord = {
      id: uuidv4(),
      filename,
      stats: { ...stats, inserted, updated },
      importedAt: new Date().toISOString(),
    };

    await db.collection("import_history").insertOne(historyRecord);
    res.json(historyRecord);
  } catch (error) {
    logger.error({ error }, "Failed to confirm import");
    res.status(500).json({ error: "Failed to confirm import" });
  }
});

// GET /intelligence/import/history
router.get("/intelligence/import/history", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const history = await db
      .collection("import_history")
      .find({})
      .sort({ importedAt: -1 })
      .limit(50)
      .toArray();

    res.json(
      history.map((h) => ({
        id: h.id,
        filename: h.filename,
        stats: h.stats,
        importedAt: h.importedAt,
      }))
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch import history");
    res.status(500).json({ error: "Failed to fetch import history" });
  }
});

export default router;
