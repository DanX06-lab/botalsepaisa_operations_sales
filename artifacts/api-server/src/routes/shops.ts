import { Router, type IRouter } from "express";
import { getDb, generateShopId } from "../lib/mongodb";
import { uploadShopPhoto, deleteShopPhoto } from "../lib/cloudinary";
import { requireAuth } from "../middlewares/auth";
import {
  ListShopsQueryParams,
  CreateShopBody,
  GetShopParams,
  UpdateShopParams,
  UpdateShopBody,
  DeleteShopParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth);

function serializeShop(s: any) {
  return {
    ...s,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  };
}

router.get("/shops", async (req, res): Promise<void> => {
  const query = ListShopsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, page = 1, limit = 10 } = query.data;
  const db = getDb();
  const skip = (Number(page) - 1) * Number(limit);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { shopName: { $regex: search, $options: "i" } },
      { ownerName: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
      { shopId: { $regex: search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    db.collection("shops")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    db.collection("shops").countDocuments(filter),
  ]);

  const shops = data.map(serializeShop);

  res.json({ data: shops, total, page: Number(page), limit: Number(limit) });
});

router.post("/shops", async (req, res): Promise<void> => {
  const parsed = CreateShopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { 
    shopName, 
    ownerName, 
    mobile, 
    latitude, 
    longitude, 
    accuracy, 
    photoBase64 
  } = parsed.data;

  // Validate required fields
  if (!shopName || !ownerName || !mobile) {
    res.status(400).json({ error: "shopName, ownerName, and mobile are required" });
    return;
  }

  // Validate mobile format (Indian mobile)
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    res.status(400).json({ error: "Invalid Indian mobile number format" });
    return;
  }

  // GPS coordinates are mandatory for new shop
  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: "GPS coordinates (latitude and longitude) are required for new shop" });
    return;
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90) {
    res.status(400).json({ error: "Latitude must be between -90 and 90" });
    return;
  }
  if (longitude < -180 || longitude > 180) {
    res.status(400).json({ error: "Longitude must be between -180 and 180" });
    return;
  }
  if (accuracy !== undefined && accuracy < 0) {
    res.status(400).json({ error: "Accuracy must be >= 0" });
    return;
  }

  // Photo is required for new shop
  if (!photoBase64) {
    res.status(400).json({ error: "Photo is required for new shop" });
    return;
  }

  const db = getDb();
  
  // Upload photo to Cloudinary
  let photoUrl: string | null = null;
  try {
    photoUrl = await uploadShopPhoto(photoBase64);
  } catch (error) {
    res.status(500).json({ error: "Failed to upload photo" });
    return;
  }

  // Generate shop ID
  const shopId = await generateShopId();
  const id = await db.collection("counters").findOneAndUpdate(
    { name: "shopId" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const shopNumericId = id ? id.value : 1;

  const shop = {
    id: shopNumericId,
    shopId,
    shopName,
    ownerName,
    mobile,
    latitude,
    longitude,
    accuracy: accuracy ?? null,
    locationCapturedAt: new Date(),
    photoUrl,
    createdAt: new Date()
  };

  await db.collection("shops").insertOne(shop);

  req.log.info({ shopId, shopName, ownerName, mobile }, "Shop created");
  res.status(201).json(serializeShop(shop));
});

router.get("/shops/:id", async (req, res): Promise<void> => {
  const params = GetShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const shop = await db.collection("shops").findOne({ id: params.data.id });
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  res.json(serializeShop(shop));
});

router.put("/shops/:id", async (req, res): Promise<void> => {
  const params = UpdateShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateShopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const db = getDb();
  const existing = await db.collection("shops").findOne({ id: params.data.id });
  if (!existing) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  
  if (parsed.data.shopName !== undefined) updateData.shopName = parsed.data.shopName;
  if (parsed.data.ownerName !== undefined) updateData.ownerName = parsed.data.ownerName;
  if (parsed.data.mobile !== undefined) {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(parsed.data.mobile)) {
      res.status(400).json({ error: "Invalid Indian mobile number format" });
      return;
    }
    updateData.mobile = parsed.data.mobile;
  }
  if (parsed.data.latitude !== undefined) {
    if (parsed.data.latitude < -90 || parsed.data.latitude > 90) {
      res.status(400).json({ error: "Latitude must be between -90 and 90" });
      return;
    }
    updateData.latitude = parsed.data.latitude;
  }
  if (parsed.data.longitude !== undefined) {
    if (parsed.data.longitude < -180 || parsed.data.longitude > 180) {
      res.status(400).json({ error: "Longitude must be between -180 and 180" });
      return;
    }
    updateData.longitude = parsed.data.longitude;
  }
  if (parsed.data.accuracy !== undefined) {
    if (parsed.data.accuracy < 0) {
      res.status(400).json({ error: "Accuracy must be >= 0" });
      return;
    }
    updateData.accuracy = parsed.data.accuracy;
  }
  if (parsed.data.photoBase64 !== undefined) {
    // Delete old photo if exists
    if (existing.photoUrl) {
      await deleteShopPhoto(existing.photoUrl);
    }
    // Upload new photo
    try {
      updateData.photoUrl = await uploadShopPhoto(parsed.data.photoBase64);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload photo" });
      return;
    }
  }

  if (parsed.data.latitude !== undefined || parsed.data.longitude !== undefined) {
    updateData.locationCapturedAt = new Date();
  }

  const updated = await db.collection("shops").findOneAndUpdate(
    { id: params.data.id },
    { $set: updateData },
    { returnDocument: "after" }
  );

  req.log.info({ id: params.data.id }, "Shop updated");
  res.json(serializeShop(updated));
});

router.delete("/shops/:id", async (req, res): Promise<void> => {
  const params = DeleteShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const existing = await db.collection("shops").findOne({ id: params.data.id });
  if (!existing) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  // Delete photo from Cloudinary if exists
  if (existing.photoUrl) {
    await deleteShopPhoto(existing.photoUrl);
  }

  await db.collection("shops").deleteOne({ id: params.data.id });
  req.log.info({ id: params.data.id }, "Shop deleted");
  res.sendStatus(204);
});

export default router;
