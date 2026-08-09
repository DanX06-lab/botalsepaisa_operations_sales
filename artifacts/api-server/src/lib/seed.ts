import bcrypt from "bcryptjs";
import { getDb, getNextSequenceValue } from "./mongodb";
import { logger } from "./logger";

export async function seed() {
  const db = getDb();
  
  // Ensure admin user exists using environment variables
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD environment variable is required");
  }
  
  const existing = await db.collection("users").findOne({ username: adminUsername });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const userId = await getNextSequenceValue("userId");
    await db.collection("users").insertOne({
      id: userId,
      username: adminUsername,
      passwordHash,
      role: "admin",
      createdAt: new Date()
    });
    logger.info(`Admin user created (username: ${adminUsername})`);
  }

  // Ensure default settings exist
  const settings = await db.collection("settings").findOne({ id: 1 });
  if (!settings) {
    await db.collection("settings").insertOne({
      id: 1,
      pricePerKg: 12
    });
    logger.info("Default settings created (pricePerKg: 12)");
  }
}
