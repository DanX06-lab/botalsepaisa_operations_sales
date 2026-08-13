import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { logger } from "../lib/logger";

const router = Router();

// GET /intelligence/businesses/map
router.get("/intelligence/businesses/map", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const query: any = {};

    const {
      min_lng, min_lat, max_lng, max_lat,
      business_type, zone_id, area_id,
      rating_min, cuisine, verification_status
    } = req.query;

    if (min_lng && min_lat && max_lng && max_lat) {
      const minLng = parseFloat(min_lng as string);
      const minLat = parseFloat(min_lat as string);
      const maxLng = parseFloat(max_lng as string);
      const maxLat = parseFloat(max_lat as string);

      if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
        query.location = {
          $geoWithin: {
            $geometry: {
              type: "Polygon",
              coordinates: [[
                [minLng, minLat],
                [maxLng, minLat],
                [maxLng, maxLat],
                [minLng, maxLat],
                [minLng, minLat]
              ]]
            }
          }
        };
      }
    }

    if (business_type) query.business_type = business_type;
    if (zone_id) query.zone_id = zone_id;
    if (area_id) query.area_id = area_id;
    if (verification_status) query.verification_status = verification_status;
    
    if (rating_min) {
      const ratingMin = parseFloat(rating_min as string);
      if (!isNaN(ratingMin)) {
        query.rating = { $gte: ratingMin };
      }
    }

    if (cuisine) {
      const cuisines = Array.isArray(cuisine) ? cuisine : [cuisine];
      query.cuisine = { $in: cuisines };
    }

    const total_available = await db.collection("intelligence_businesses").countDocuments(query);
    const limit = 1000;
    
    const businesses = await db.collection("intelligence_businesses")
      .find(query)
      .limit(limit)
      .project({
        _id: 0,
        id: 1,
        name: 1,
        business_type: 1,
        latitude: 1,
        longitude: 1,
        rating: 1,
        review_count: 1,
        price_range: 1,
        cuisine: 1,
        zone_id: 1,
        area_id: 1,
        verification_status: 1
      })
      .toArray();

    const limit_reached = businesses.length === limit && total_available > limit;

    res.json({
      data: businesses,
      total_available,
      returned_count: businesses.length,
      limit_reached
    });
  } catch (err) {
    logger.error({ error: err }, "Failed to load intelligence map data");
    res.status(500).json({ error: "Failed to load intelligence map data" });
  }
});

// GET /intelligence/businesses/nearby
router.get("/intelligence/businesses/nearby", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    
    const lng = parseFloat(req.query.lng as string);
    const lat = parseFloat(req.query.lat as string);
    const radius_km = parseFloat(req.query.radius_km as string) || 5;

    if (isNaN(lng) || isNaN(lat)) {
      res.status(400).json({ error: "Invalid lng/lat" });
      return;
    }

    const maxDistance = radius_km * 1000; // converted to meters

    const query = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: maxDistance
        }
      }
    };

    const limit = 500;
    
    const total_available = await db.collection("intelligence_businesses").countDocuments(query);

    const businesses = await db.collection("intelligence_businesses")
      .find(query)
      .limit(limit)
      .project({
        _id: 0,
        id: 1,
        name: 1,
        business_type: 1,
        latitude: 1,
        longitude: 1,
        rating: 1,
        review_count: 1,
        price_range: 1,
        cuisine: 1,
        zone_id: 1,
        area_id: 1,
        verification_status: 1
      })
      .toArray();

    res.json({
      data: businesses,
      total_available,
      returned_count: businesses.length,
      limit_reached: businesses.length === limit && total_available > limit
    });
  } catch (err) {
    logger.error({ error: err }, "Failed to get nearby intelligence businesses");
    res.status(500).json({ error: "Failed to get nearby intelligence businesses" });
  }
});

export default router;
