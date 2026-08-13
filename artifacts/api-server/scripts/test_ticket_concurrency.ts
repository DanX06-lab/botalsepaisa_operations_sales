import { MongoClient } from "mongodb";
import { getDb, connectToMongoDB } from "../src/lib/mongodb";
import { PickupService } from "../src/services/whatsapp/pickup_service";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runTests() {
  console.log("Initializing database connection...");
  await connectToMongoDB();
  const db = getDb();

  const pickupService = new PickupService();
  const numConcurrent = 50;
  console.log(`Running ${numConcurrent} concurrent ticket generation requests...`);

  // Fire all requests concurrently
  const promises = [];
  for (let i = 0; i < numConcurrent; i++) {
    promises.push(pickupService.generateTicketId());
  }

  const tickets = await Promise.all(promises);
  
  // Verify duplicates
  const uniqueTickets = new Set(tickets);
  const hasDuplicates = uniqueTickets.size !== tickets.length;
  
  if (hasDuplicates) {
    console.error(`FAIL: Duplicates found! Generated ${tickets.length} tickets but only ${uniqueTickets.size} were unique.`);
    process.exit(1);
  } else {
    console.log(`PASS: No duplicates found. Generated ${uniqueTickets.size} unique tickets.`);
    console.log("Sample tickets:", tickets.slice(0, 3).join(", "));
  }

  console.log("Finished successfully.");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
