import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { logger } from "./logger";

export async function seed() {
  // Ensure default admin user exists
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("botalsepaisa123", 10);
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        role: "admin",
      },
    });
    logger.info("Default admin user created (username: admin)");
  }

  // Ensure default settings exist
  const settings = await prisma.setting.findFirst();
  if (!settings) {
    await prisma.setting.create({ data: { pricePerKg: 12 } });
    logger.info("Default settings created (pricePerKg: 12)");
  }
}
