import { Router, type IRouter } from "express";
import { getDb, getNextSequenceValue } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";
import { generateRoute, type RouteStop, type GeneratedRoute } from "../utils/routing";
import { calculateDistanceKm, estimateTravelTime, type Coordinates } from "../utils/geo";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(requireAuth);

// GET /api/routes/today - Get today's route for the authenticated user
router.get("/routes/today", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const db = getDb();

  const route = await db.collection("routes").findOne({
    routeDate: today,
    createdBy: userId,
  });

  if (!route) {
    res.status(404).json({ error: "No route found for today" });
    return;
  }

  res.json(route);
});

// GET /api/routes - Get all routes for the authenticated user
router.get("/routes", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const db = getDb();
  const routes = await db.collection("routes")
    .find({ createdBy: userId })
    .sort({ routeDate: -1 })
    .toArray();

  res.json(routes);
});

// GET /api/routes/eligible-shops - Get shops with valid GPS for route planning
router.get("/routes/eligible-shops", async (req, res): Promise<void> => {
  const db = getDb();
  
  const shops = await db.collection("shops")
    .find({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
    })
    .project({
      id: 1,
      shopId: 1,
      shopName: 1,
      ownerName: 1,
      mobile: 1,
      latitude: 1,
      longitude: 1,
    })
    .toArray();

  res.json(shops);
});

// GET /api/routes/:id - Get a specific route
router.get("/routes/:id", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const routeId = parseInt(req.params.id);
  if (isNaN(routeId)) {
    res.status(400).json({ error: "Invalid route ID" });
    return;
  }

  const db = getDb();
  const route = await db.collection("routes").findOne({
    id: routeId,
    createdBy: userId,
  });

  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  res.json(route);
});

// POST /api/routes/generate - Generate a new route
router.post("/routes/generate", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { routeDate, shopIds } = req.body;

  // Validate input
  if (!routeDate) {
    res.status(400).json({ error: "routeDate is required" });
    return;
  }

  if (!shopIds || !Array.isArray(shopIds) || shopIds.length === 0) {
    res.status(400).json({ error: "shopIds is required and must be a non-empty array" });
    return;
  }

  const db = getDb();

  // Check if route already exists for this date
  const existingRoute = await db.collection("routes").findOne({
    routeDate,
    createdBy: userId,
    status: { $in: ["PLANNED", "IN_PROGRESS"] },
  });

  if (existingRoute) {
    res.status(409).json({ error: "Route already exists for this date" });
    return;
  }

  // Get home location from settings
  const settings = await db.collection("settings").findOne({ id: 1 });
  if (!settings || !settings.homeLatitude || !settings.homeLongitude) {
    res.status(400).json({ error: "Home location is not configured" });
    return;
  }

  const homeLocation: Coordinates = {
    latitude: settings.homeLatitude,
    longitude: settings.homeLongitude,
  };

  // Validate home coordinates
  if (homeLocation.latitude < -90 || homeLocation.latitude > 90) {
    res.status(400).json({ error: "Invalid home latitude" });
    return;
  }
  if (homeLocation.longitude < -180 || homeLocation.longitude > 180) {
    res.status(400).json({ error: "Invalid home longitude" });
    return;
  }

  // Get selected shops
  const shops = await db.collection("shops")
    .find({ id: { $in: shopIds } })
    .toArray();

  if (shops.length === 0) {
    res.status(400).json({ error: "No valid shops found" });
    return;
  }

  // Validate all shops have GPS
  const shopsWithoutGPS = shops.filter(
    (shop: any) => !shop.latitude || !shop.longitude
  );
  if (shopsWithoutGPS.length > 0) {
    res.status(400).json({
      error: "Some shops do not have valid GPS coordinates",
      shopsWithoutGPS: shopsWithoutGPS.map((s: any) => s.shopName),
    });
    return;
  }

  // Generate route
  const generatedRoute: GeneratedRoute = generateRoute(
    homeLocation,
    shops as any[]
  );

  // Create route document
  const routeId = await getNextSequenceValue("routeId");
  const route = {
    id: routeId,
    routeDate,
    createdBy: userId,
    homeLocation,
    stops: generatedRoute.stops,
    totalShops: generatedRoute.stops.length,
    totalDistanceKm: generatedRoute.totalDistanceKm,
    estimatedDurationMinutes: generatedRoute.estimatedDurationMinutes,
    status: "PLANNED",
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
  };

  await db.collection("routes").insertOne(route);

  logger.info(
    { routeId, routeDate, totalShops: route.totalShops },
    "Route generated"
  );

  res.status(201).json(route);
});

// POST /api/routes/:id/start - Start a route
router.post("/routes/:id/start", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const routeId = parseInt(req.params.id);
  if (isNaN(routeId)) {
    res.status(400).json({ error: "Invalid route ID" });
    return;
  }

  const db = getDb();
  const route = await db.collection("routes").findOne({
    id: routeId,
    createdBy: userId,
  });

  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  if (route.status !== "PLANNED") {
    res.status(400).json({ error: "Route can only be started from PLANNED status" });
    return;
  }

  const updated = await db.collection("routes").findOneAndUpdate(
    { id: routeId },
    {
      $set: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  logger.info({ routeId }, "Route started");
  res.json(updated);
});

// POST /api/routes/:id/complete - Complete a route
router.post("/routes/:id/complete", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const routeId = parseInt(req.params.id);
  if (isNaN(routeId)) {
    res.status(400).json({ error: "Invalid route ID" });
    return;
  }

  const db = getDb();
  const route = await db.collection("routes").findOne({
    id: routeId,
    createdBy: userId,
  });

  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  if (route.status !== "IN_PROGRESS") {
    res.status(400).json({ error: "Route can only be completed from IN_PROGRESS status" });
    return;
  }

  // Check if all stops are either VISITED or SKIPPED
  const pendingStops = route.stops.filter(
    (stop: RouteStop) => stop.status === "PENDING"
  );
  if (pendingStops.length > 0) {
    res.status(400).json({
      error: "Complete or skip all remaining shops before finishing the route",
      pendingStops: pendingStops.length,
    });
    return;
  }

  const updated = await db.collection("routes").findOneAndUpdate(
    { id: routeId },
    {
      $set: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  logger.info({ routeId }, "Route completed");
  res.json(updated);
});

// POST /api/routes/:id/cancel - Cancel a route
router.post("/routes/:id/cancel", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const routeId = parseInt(req.params.id);
  if (isNaN(routeId)) {
    res.status(400).json({ error: "Invalid route ID" });
    return;
  }

  const db = getDb();
  const route = await db.collection("routes").findOne({
    id: routeId,
    createdBy: userId,
  });

  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  if (route.status === "COMPLETED") {
    res.status(400).json({ error: "Cannot cancel a completed route" });
    return;
  }

  const updated = await db.collection("routes").findOneAndUpdate(
    { id: routeId },
    {
      $set: {
        status: "CANCELLED",
      },
    },
    { returnDocument: "after" }
  );

  logger.info({ routeId }, "Route cancelled");
  res.json(updated);
});

// POST /api/routes/:id/regenerate - Regenerate a route
router.post("/routes/:id/regenerate", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const routeId = parseInt(req.params.id);
  if (isNaN(routeId)) {
    res.status(400).json({ error: "Invalid route ID" });
    return;
  }

  const { shopIds } = req.body;

  if (!shopIds || !Array.isArray(shopIds) || shopIds.length === 0) {
    res.status(400).json({ error: "shopIds is required and must be a non-empty array" });
    return;
  }

  const db = getDb();
  const existingRoute = await db.collection("routes").findOne({
    id: routeId,
    createdBy: userId,
  });

  if (!existingRoute) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  if (existingRoute.status === "COMPLETED") {
    res.status(400).json({ error: "Cannot regenerate a completed route" });
    return;
  }

  // Cancel existing route
  await db.collection("routes").updateOne(
    { id: routeId },
    { $set: { status: "CANCELLED" } }
  );

  // Get home location from settings
  const settings = await db.collection("settings").findOne({ id: 1 });
  if (!settings || !settings.homeLatitude || !settings.homeLongitude) {
    res.status(400).json({ error: "Home location is not configured" });
    return;
  }

  const homeLocation: Coordinates = {
    latitude: settings.homeLatitude,
    longitude: settings.homeLongitude,
  };

  // Get selected shops
  const shops = await db.collection("shops")
    .find({ id: { $in: shopIds } })
    .toArray();

  if (shops.length === 0) {
    res.status(400).json({ error: "No valid shops found" });
    return;
  }

  // Generate new route
  const generatedRoute: GeneratedRoute = generateRoute(
    homeLocation,
    shops as any[]
  );

  // Create new route document
  const newRouteId = await getNextSequenceValue("routeId");
  const newRoute = {
    id: newRouteId,
    routeDate: existingRoute.routeDate,
    createdBy: userId,
    homeLocation,
    stops: generatedRoute.stops,
    totalShops: generatedRoute.stops.length,
    totalDistanceKm: generatedRoute.totalDistanceKm,
    estimatedDurationMinutes: generatedRoute.estimatedDurationMinutes,
    status: "PLANNED",
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
  };

  await db.collection("routes").insertOne(newRoute);

  logger.info(
    { oldRouteId: routeId, newRouteId, routeDate: existingRoute.routeDate },
    "Route regenerated"
  );

  res.status(201).json(newRoute);
});

// POST /api/routes/:id/stops/:stopId/visit - Mark a stop as visited
router.post("/routes/:id/stops/:stopId/visit", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const routeId = parseInt(req.params.id);
  const stopSequence = parseInt(req.params.stopId);
  const { collectionId } = req.body;

  if (isNaN(routeId) || isNaN(stopSequence)) {
    res.status(400).json({ error: "Invalid route ID or stop ID" });
    return;
  }

  const db = getDb();
  const route = await db.collection("routes").findOne({
    id: routeId,
    createdBy: userId,
  });

  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  if (route.status !== "IN_PROGRESS") {
    res.status(400).json({ error: "Route must be in progress to mark stops" });
    return;
  }

  // Find the stop
  const stopIndex = route.stops.findIndex(
    (stop: RouteStop) => stop.sequence === stopSequence
  );

  if (stopIndex === -1) {
    res.status(404).json({ error: "Stop not found" });
    return;
  }

  const stop = route.stops[stopIndex];
  if (stop.status !== "PENDING") {
    res.status(400).json({ error: "Stop has already been processed" });
    return;
  }

  // Update stop
  const updatePath = `stops.${stopIndex}`;
  const updated = await db.collection("routes").findOneAndUpdate(
    { id: routeId },
    {
      $set: {
        [`${updatePath}.status`]: "VISITED",
        [`${updatePath}.visitedAt`]: new Date(),
        [`${updatePath}.collectionId`]: collectionId || null,
      },
    },
    { returnDocument: "after" }
  );

  logger.info({ routeId, stopSequence, collectionId }, "Stop marked as visited");
  res.json(updated);
});

// POST /api/routes/:id/stops/:stopId/skip - Skip a stop
router.post("/routes/:id/stops/:stopId/skip", async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const routeId = parseInt(req.params.id);
  const stopSequence = parseInt(req.params.stopId);
  const { skipReason } = req.body;

  if (isNaN(routeId) || isNaN(stopSequence)) {
    res.status(400).json({ error: "Invalid route ID or stop ID" });
    return;
  }

  if (!skipReason || typeof skipReason !== 'string' || skipReason.trim() === '') {
    res.status(400).json({ error: "skipReason is required" });
    return;
  }

  const db = getDb();
  const route = await db.collection("routes").findOne({
    id: routeId,
    createdBy: userId,
  });

  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  if (route.status !== "IN_PROGRESS") {
    res.status(400).json({ error: "Route must be in progress to skip stops" });
    return;
  }

  // Find the stop
  const stopIndex = route.stops.findIndex(
    (stop: RouteStop) => stop.sequence === stopSequence
  );

  if (stopIndex === -1) {
    res.status(404).json({ error: "Stop not found" });
    return;
  }

  const stop = route.stops[stopIndex];
  if (stop.status !== "PENDING") {
    res.status(400).json({ error: "Stop has already been processed" });
    return;
  }

  // Update stop
  const updatePath = `stops.${stopIndex}`;
  const updated = await db.collection("routes").findOneAndUpdate(
    { id: routeId },
    {
      $set: {
        [`${updatePath}.status`]: "SKIPPED",
        [`${updatePath}.skipReason`]: skipReason.trim(),
      },
    },
    { returnDocument: "after" }
  );

  logger.info({ routeId, stopSequence, skipReason }, "Stop skipped");
  res.json(updated);
});

export default router;
