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
  await database.collection("users").createIndex({ username: 1 }, { unique: true });
  
  // Shops collection indexes
  await database.collection("shops").createIndex({ shopId: 1 }, { unique: true });
  await database.collection("shops").createIndex({ shopName: 1 });
  await database.collection("shops").createIndex({ ownerName: 1 });
  await database.collection("shops").createIndex({ mobile: 1 });
  
  // Collections collection indexes
  await database.collection("collections").createIndex({ shopId: 1 });
  await database.collection("collections").createIndex({ collectionDate: 1 });
  await database.collection("collections").createIndex({ paymentStatus: 1 });
  
  // Counters collection indexes
  await database.collection("counters").createIndex({ name: 1 }, { unique: true });
  
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
