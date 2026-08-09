import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error("Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are required");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export async function uploadShopPhoto(base64Data: string): Promise<string> {
  try {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
    
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64Image}`,
      {
        folder: "botalsepaisa/shops",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto" }
        ]
      }
    );
    
    logger.info(`Shop photo uploaded to Cloudinary: ${result.public_id}`);
    return result.secure_url;
  } catch (error) {
    logger.error({ error }, "Failed to upload photo to Cloudinary");
    throw new Error("Failed to upload photo to Cloudinary");
  }
}

export async function deleteShopPhoto(publicUrl: string): Promise<void> {
  try {
    // Extract public_id from URL
    const publicId = publicUrl.split("/").slice(-2).join("/").split(".")[0];
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Shop photo deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error({ error }, "Failed to delete photo from Cloudinary");
    // Don't throw error - deletion failure shouldn't block the main operation
  }
}
