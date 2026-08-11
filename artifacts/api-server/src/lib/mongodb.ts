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
  
  const indexes = [
    // Users collection indexes
    { collection: "users", keys: { username: 1 }, options: { name: "username_idx", unique: true } },
    
    // Shops collection indexes
    { collection: "shops", keys: { shopId: 1 }, options: { name: "shopId_idx", unique: true, sparse: true } },
    { collection: "shops", keys: { shopName: 1 }, options: { name: "shopName_idx" } },
    { collection: "shops", keys: { ownerName: 1 }, options: { name: "ownerName_idx" } },
    { collection: "shops", keys: { mobile: 1 }, options: { name: "mobile_idx" } },
    
    // Collections collection indexes
    { collection: "collections", keys: { shopId: 1 }, options: { name: "collection_shopId_idx" } },
    { collection: "collections", keys: { collectionDate: 1 }, options: { name: "collectionDate_idx" } },
    { collection: "collections", keys: { paymentStatus: 1 }, options: { name: "paymentStatus_idx" } },
    { collection: "collections", keys: { routeId: 1 }, options: { name: "collection_routeId_idx" } },
    
    // Counters collection indexes
    { collection: "counters", keys: { name: 1 }, options: { name: "counter_name_idx", unique: true } },
    
    // Routes collection indexes
    { collection: "routes", keys: { routeDate: 1 }, options: { name: "routeDate_idx" } },
    { collection: "routes", keys: { createdBy: 1 }, options: { name: "createdBy_idx" } },
    { collection: "routes", keys: { status: 1 }, options: { name: "route_status_idx" } },
    { collection: "routes", keys: { routeDate: 1, createdBy: 1 }, options: { name: "routeDate_createdBy_idx", unique: true, partialFilterExpression: { status: { $in: ["PLANNED", "IN_PROGRESS"] } } } },
  ];

  for (const index of indexes) {
    try {
      await database.collection(index.collection).createIndex(index.keys as any, index.options);
    } catch (error: any) {
      if (error.code === 85) {
        // IndexOptionsConflict - index already exists with different name
        logger.warn(`Index on ${index.collection} already exists, skipping`);
      } else {
        logger.error(`Failed to create index on ${index.collection}:`, error);
      }
    }
  }
  
  logger.info("MongoDB indexes created/verified");
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
