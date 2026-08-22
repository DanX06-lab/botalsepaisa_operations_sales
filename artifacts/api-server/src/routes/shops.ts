import { Router, type IRouter } from "express";
import { getDb, getNextSequenceValue } from "../lib/mongodb";
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

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
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
  if (search && search !== "undefined") {
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
    photoBase64,
    remark
  } = parsed.data;

  // Validate required fields
  if (!shopName || !ownerName || !mobile) {
    res.status(400).json({ error: "shopName, ownerName, and mobile are required" });
    return;
  }

  // Validate mobile format (Indian mobile)
  const normalizedMobile = normalizePhoneNumber(mobile);
  if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
    res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
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
  const shopNumericId = await getNextSequenceValue("shopId");
  const shopId = `BSP${String(shopNumericId).padStart(4, "0")}`;

  const shop = {
    id: shopNumericId,
    shopId,
    shopName,
    ownerName,
    mobile: normalizedMobile,
    latitude,
    longitude,
    accuracy: accuracy ?? null,
    locationCapturedAt: new Date(),
    photoUrl,
    remark: remark || null,
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
  if (parsed.data.remark !== undefined) updateData.remark = parsed.data.remark;
  if (parsed.data.mobile !== undefined) {
    const normalizedMobile = normalizePhoneNumber(parsed.data.mobile);
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
      return;
    }
    updateData.mobile = normalizedMobile;
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
