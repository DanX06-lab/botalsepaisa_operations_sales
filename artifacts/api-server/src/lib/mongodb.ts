import { MongoClient, Db, Collection } from "mongodb";
import { logger } from "./logger";

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || "botalsepaisa_operations";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

// Type assertion after runtime check
const MONGO_URI: string = MONGODB_URI;

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (client && db) {
    return db;
  }

  logger.info("Connecting to MongoDB...");
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DATABASE_NAME);
  
  // Ping MongoDB to verify connection
  await db.command({ ping: 1 });
  logger.info("MongoDB connected successfully");
  
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectToMongoDB() first.");
  }
  return db;
}

export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    logger.info("MongoDB connection closed");
    client = null;
    db = null;
  }
}

export async function createIndexes(): Promise<void> {
  const database = getDb();
  
  // Users collection indexes
  await database.collection("users").createIndex({ username: 1 }, { name: "username_idx", unique: true });
  
  // Shops collection indexes
  await database.collection("shops").createIndex({ shopId: 1 }, { name: "shopId_idx", unique: true, sparse: true });
  await database.collection("shops").createIndex({ shopName: 1 }, { name: "shopName_idx" });
  await database.collection("shops").createIndex({ ownerName: 1 }, { name: "ownerName_idx" });
  await database.collection("shops").createIndex({ mobile: 1 }, { name: "mobile_idx" });
  
  // Collections collection indexes
  await database.collection("collections").createIndex({ shopId: 1 }, { name: "collection_shopId_idx" });
  await database.collection("collections").createIndex({ collectionDate: 1 }, { name: "collectionDate_idx" });
  await database.collection("collections").createIndex({ paymentStatus: 1 }, { name: "paymentStatus_idx" });
  
  // Counters collection indexes
  await database.collection("counters").createIndex({ name: 1 }, { name: "counter_name_idx", unique: true });
  
  // Routes collection indexes
  await database.collection("routes").createIndex({ routeDate: 1 }, { name: "routeDate_idx" });
  await database.collection("routes").createIndex({ createdBy: 1 }, { name: "createdBy_idx" });
  await database.collection("routes").createIndex({ status: 1 }, { name: "route_status_idx" });
  await database.collection("routes").createIndex({ routeDate: 1, createdBy: 1 }, { name: "routeDate_createdBy_idx", unique: true, partialFilterExpression: { status: { $in: ["PLANNED", "IN_PROGRESS"] } } });
  
  // Collections collection index for routeId
  await database.collection("collections").createIndex({ routeId: 1 }, { name: "collection_routeId_idx" });
  
  logger.info("MongoDB indexes created");
}

// Atomic sequence generator for numeric IDs
export async function getNextSequenceValue(sequenceName: string): Promise<number> {
  const database = getDb();
  const countersCollection = database.collection("counters");
  
  const result = await countersCollection.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  
  if (!result) {
    throw new Error(`Failed to get sequence value for ${sequenceName}`);
  }
  
  return result.value || 1;
}

// Generate BSP shop ID (BSP0001, BSP0002, etc.)
export async function generateShopId(): Promise<string> {
  const nextId = await getNextSequenceValue("shopId");
  return `BSP${String(nextId).padStart(4, "0")}`;
}
