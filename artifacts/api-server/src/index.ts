import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { logger } from "./lib/logger";
import { seed } from "./lib/seed";
import { connectToMongoDB, createIndexes, closeMongoDB } from "./lib/mongodb";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutdown signal received");
  
  try {
    await closeMongoDB();
    logger.info("MongoDB connection closed");
  } catch (err) {
    logger.error({ err }, "Error closing MongoDB connection");
  }
  
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Startup sequence
async function start() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    logger.info("MongoDB connected");
    
    // Create indexes
    await createIndexes();
    logger.info("MongoDB indexes created");
    
    // Seed database
    await seed();
    logger.info("Database seeded");
    
    // Start HTTP server
    const server = app.listen(port, "0.0.0.0", (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "BotalSePaisa API Server listening");
    });
    
    // Handle server errors
    server.on("error", (err) => {
      logger.error({ err }, "Server error");
      process.exit(1);
    });
    
  } catch (err) {
    logger.error({ err }, "Startup failed");
    process.exit(1);
  }
}

start();
