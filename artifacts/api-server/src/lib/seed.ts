import bcrypt from "bcryptjs";
import { getDb, getNextSequenceValue } from "./mongodb";
import { logger } from "./logger";

export async function seed() {
  const db = getDb();
  
  // Ensure admin user exists using environment variables
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword || typeof adminPassword !== 'string' || adminPassword.trim() === '') {
    throw new Error("ADMIN_PASSWORD environment variable is required and must be a non-empty string");
  }
  
  const existing = await db.collection("users").findOne({ username: adminUsername });
  const passwordHash = await bcrypt.hash(adminPassword.trim(), 10);
  
  if (!existing) {
    const userId = await getNextSequenceValue("userId");
    await db.collection("users").insertOne({
      id: userId,
      username: adminUsername,
      passwordHash,
      role: "admin",
      createdAt: new Date()
    });
    logger.info(`Admin user created (username: ${adminUsername})`);
  } else {
    // Always sync the admin password with the environment variable on startup
    await db.collection("users").updateOne(
      { username: adminUsername },
      { $set: { passwordHash } }
    );
    logger.info(`Admin user password synced (username: ${adminUsername})`);
  }

  // Ensure default settings exist
  const settings = await db.collection("settings").findOne({ id: 1 });
  if (!settings) {
    await db.collection("settings").insertOne({
      id: 1,
      homeLatitude: null,
      homeLongitude: null
    });
    logger.info("Default settings created");
  }
}
