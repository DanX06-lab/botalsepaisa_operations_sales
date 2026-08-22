import { Router, type IRouter } from "express";
import { getDb, getNextSequenceValue } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";
import {
  ListCollectionsQueryParams,
  CreateCollectionBody,
  GetCollectionParams,
  UpdatePaymentStatusParams,
  UpdatePaymentStatusBody,
  UpdateCollectionParams,
  UpdateCollectionBody,
} from "@workspace/api-zod";
import { ObjectId } from "mongodb";

const router: IRouter = Router();

router.use(requireAuth);

function serializeCollection(c: any, shop?: any) {
  return {
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    shop: shop
      ? { ...shop, createdAt: shop.createdAt instanceof Date ? shop.createdAt.toISOString() : shop.createdAt }
      : undefined,
  };
}

router.get("/collections", async (req, res): Promise<void> => {
  const query = ListCollectionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const {
    shopId,
    startDate,
    endDate,
    paymentStatus,
    page = 1,
    limit = 20,
  } = query.data;

  const db = getDb();
  const filter: Record<string, unknown> = {};
  if (shopId) filter.shopId = Number(shopId);
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (startDate || endDate) {
    filter.collectionDate = {
      ...(startDate ? { $gte: startDate } : {}),
      ...(endDate ? { $lte: endDate } : {}),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    db.collection("collections")
      .find(filter)
      .sort({ collectionDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    db.collection("collections").countDocuments(filter),
  ]);

  // Fetch shops for each collection
  const shopIds = [...new Set(data.map((c: any) => c.shopId))];
  const shops = await db.collection("shops")
    .find({ id: { $in: shopIds } })
    .toArray();
  const shopMap = new Map(shops.map((s: any) => [s.id, s]));

  const serialized = data.map((c: any) => serializeCollection(c, shopMap.get(c.shopId)));

  res.json({
    data: serialized,
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

router.post("/collections", async (req, res): Promise<void> => {
  const parsed = CreateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { shopId, collectionDate, weightKg, routeId, routeStopSequence } = parsed.data;
  const db = getDb();

  const shop = await db.collection("shops").findOne({ id: shopId });
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  const setting = await db.collection("settings").findOne({ id: 1 });
  const ratePerKg = setting?.pricePerKg ?? 12;
  const totalAmount = Math.round(weightKg * ratePerKg * 100) / 100;

  const id = await getNextSequenceValue("collectionId");
  const collection = {
    id,
    shopId,
    collectionDate,
    weightKg,
    ratePerKg,
    totalAmount,
    paymentStatus: "PENDING",
    paymentDate: null,
    paidBy: null,
    routeId: routeId ?? null,
    routeStopSequence: routeStopSequence ?? null,
    createdAt: new Date()
  };

  await db.collection("collections").insertOne(collection);

  req.log.info({ id, shopId, routeId }, "Collection entry created");
  res.status(201).json(serializeCollection(collection, shop));
});

router.get("/collections/:id", async (req, res): Promise<void> => {
  const params = GetCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const collection = await db.collection("collections").findOne({ id: params.data.id });

  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const shop = await db.collection("shops").findOne({ id: collection.shopId });
  res.json(serializeCollection(collection, shop));
});

router.put("/collections/:id", async (req, res): Promise<void> => {
  const params = UpdateCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const db = getDb();
  const existing = await db.collection("collections").findOne({ id: params.data.id });
  if (!existing) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.weightKg !== undefined) {
    updateData.weightKg = parsed.data.weightKg;
  }
  if (parsed.data.ratePerKg !== undefined) {
    updateData.ratePerKg = parsed.data.ratePerKg;
  }
  
  // Recalculate total amount if weight or rate changes
  if (updateData.weightKg !== undefined || updateData.ratePerKg !== undefined) {
    const newWeight = updateData.weightKg !== undefined ? updateData.weightKg : existing.weightKg;
    const newRate = updateData.ratePerKg !== undefined ? updateData.ratePerKg : existing.ratePerKg;
    updateData.totalAmount = (newWeight as number) * (newRate as number);
  }

  const updated = await db.collection("collections").findOneAndUpdate(
    { id: params.data.id },
    { $set: updateData },
    { returnDocument: "after" }
  );

  if (!updated) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const shop = await db.collection("shops").findOne({ id: updated.shopId });
  req.log.info({ id: params.data.id }, "Collection updated");
  res.json(serializeCollection(updated, shop));
});

router.patch("/collections/:id/payment", async (req, res): Promise<void> => {
  const params = UpdatePaymentStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePaymentStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const db = getDb();
  const existing = await db.collection("collections").findOne({ id: params.data.id });
  if (!existing) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const { paymentStatus, paymentDate, paidBy } = parsed.data;
  const updated = await db.collection("collections").findOneAndUpdate(
    { id: params.data.id },
    {
      $set: {
        paymentStatus,
        paymentDate: paymentDate ?? null,
        paidBy: paidBy ?? null,
      }
    },
    { returnDocument: "after" }
  );

  if (!updated) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const shop = await db.collection("shops").findOne({ id: updated.shopId });
  res.json(serializeCollection(updated, shop));
});

router.delete("/collections/:id", async (req, res): Promise<void> => {
  const params = GetCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const existing = await db.collection("collections").findOne({ id: params.data.id });
  if (!existing) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  await db.collection("collections").deleteOne({ id: params.data.id });
  req.log.info({ id: params.data.id }, "Collection entry deleted");
  res.status(204).send();
});

export default router;
