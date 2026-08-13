import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Configure CORS based on environment
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : true;

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ 
  limit: "10mb",
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Centralized error handling
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err, url: req.url, method: req.method }, "Request error");
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Don't expose stack traces in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(statusCode).json({ error: message });
});

import { getDb } from "./lib/mongodb";
app.get("/api/migrate-shops-now", async (req, res) => {
  try {
    const db = getDb();
    const shops = await db.collection("shops").find().sort({ id: 1 }).toArray();
    let nextNumericId = 1;
    for (const shop of shops) {
      const oldId = shop.id;
      const newId = nextNumericId++;
      if (oldId === newId) continue;
      const newShopIdString = `BSP${String(newId).padStart(4, "0")}`;
      await db.collection("shops").updateOne({ _id: shop._id }, { $set: { id: newId, shopId: newShopIdString } });
      await db.collection("collections").updateMany({ shopId: oldId }, { $set: { shopId: newId } });
      const routes = await db.collection("routes").find({ shopIds: oldId }).toArray();
      for (const route of routes) {
        const updatedShopIds = route.shopIds.map((id: any) => id === oldId ? newId : id);
        const updatedStops = route.stops ? route.stops.map((stop: any) => stop.shopId === oldId ? { ...stop, shopId: newId } : stop) : [];
        await db.collection("routes").updateOne({ _id: route._id }, { $set: { shopIds: updatedShopIds, stops: updatedStops } });
      }
    }
    const highestId = nextNumericId - 1;
    await db.collection("counters").updateOne({ name: "shopId" }, { $set: { value: highestId } }, { upsert: true });
    res.json({ success: true, message: `Migrated to ${highestId}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api", router);

export default app;
