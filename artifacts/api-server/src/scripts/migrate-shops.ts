import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const url = process.env.MONGODB_URI || "";

async function migrate() {
  if (!url) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const client = new MongoClient(url);
  try {
    await client.connect();
    console.log("Connected to database");
    const db = client.db();

    // Fetch all shops sorted by id
    const shops = await db.collection("shops").find().sort({ id: 1 }).toArray();
    console.log(`Found ${shops.length} shops.`);

    let nextNumericId = 1;

    for (const shop of shops) {
      const oldId = shop.id;
      const newId = nextNumericId++;
      
      if (oldId === newId) {
        console.log(`Shop ${oldId} is already correct.`);
        continue;
      }

      const newShopIdString = `BSP${String(newId).padStart(4, "0")}`;
      console.log(`Migrating shop ${oldId} to ${newId} (${newShopIdString})`);

      // 1. Update the shop itself
      await db.collection("shops").updateOne(
        { _id: shop._id },
        { $set: { id: newId, shopId: newShopIdString } }
      );

      // 2. Update collections referencing this shopId
      await db.collection("collections").updateMany(
        { shopId: oldId },
        { $set: { shopId: newId } }
      );

      // 3. Update routes shopIds array (using atomic updates is hard for arrays if we do it one by one, 
      // but since we are migrating, we can pull the old and push the new)
      
      // Update the shopIds array
      // Note: MongoDB doesn't easily let us 'replace' an item in a simple array without knowing its index in an update query.
      // So we will find all routes containing the oldId, and manually update them.
      const routes = await db.collection("routes").find({ shopIds: oldId }).toArray();
      for (const route of routes) {
        // Update shopIds array
        const updatedShopIds = route.shopIds.map((id: number) => id === oldId ? newId : id);
        
        // Update stops array
        const updatedStops = route.stops ? route.stops.map((stop: any) => {
          if (stop.shopId === oldId) {
            return { ...stop, shopId: newId };
          }
          return stop;
        }) : [];

        await db.collection("routes").updateOne(
          { _id: route._id },
          { $set: { shopIds: updatedShopIds, stops: updatedStops } }
        );
      }
    }

    // 4. Update the counter
    const highestId = nextNumericId - 1;
    await db.collection("counters").updateOne(
      { name: "shopId" },
      { $set: { value: highestId } },
      { upsert: true }
    );
    console.log(`Counter updated to ${highestId}`);

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
  }
}

migrate();
