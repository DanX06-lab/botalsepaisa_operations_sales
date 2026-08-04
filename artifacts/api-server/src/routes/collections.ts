import { Router, type IRouter } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import {
  ListCollectionsQueryParams,
  CreateCollectionBody,
  GetCollectionParams,
  UpdatePaymentStatusParams,
  UpdatePaymentStatusBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth);

function serializeCollection(c: {
  id: number;
  shopId: number;
  collectionDate: string;
  weightKg: number;
  ratePerKg: number;
  totalAmount: number;
  paymentStatus: string;
  paymentDate: string | null;
  paidBy: string | null;
  createdAt: Date;
  shop?: {
    id: number;
    shopId: string;
    shopName: string;
    ownerName: string;
    mobile: string;
    address: string;
    createdAt: Date;
  };
}) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    shop: c.shop
      ? { ...c.shop, createdAt: c.shop.createdAt.toISOString() }
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

  const where: Record<string, unknown> = {};
  if (shopId) where.shopId = Number(shopId);
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (startDate || endDate) {
    where.collectionDate = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { collectionDate: "desc" },
      include: { shop: true },
    }),
    prisma.collection.count({ where }),
  ]);

  res.json({
    data: data.map(serializeCollection),
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

  const { shopId, collectionDate, weightKg } = parsed.data;

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  const setting = await prisma.setting.findFirst();
  const ratePerKg = setting?.pricePerKg ?? 12;
  const totalAmount = Math.round(weightKg * ratePerKg * 100) / 100;

  const collection = await prisma.collection.create({
    data: {
      shopId,
      collectionDate,
      weightKg,
      ratePerKg,
      totalAmount,
      paymentStatus: "PENDING",
    },
    include: { shop: true },
  });

  req.log.info({ id: collection.id, shopId }, "Collection entry created");
  res.status(201).json(serializeCollection(collection));
});

router.get("/collections/:id", async (req, res): Promise<void> => {
  const params = GetCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const collection = await prisma.collection.findUnique({
    where: { id: params.data.id },
    include: { shop: true },
  });

  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  res.json(serializeCollection(collection));
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

  const existing = await prisma.collection.findUnique({
    where: { id: params.data.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const { paymentStatus, paymentDate, paidBy } = parsed.data;
  const updated = await prisma.collection.update({
    where: { id: params.data.id },
    data: {
      paymentStatus,
      paymentDate: paymentDate ?? null,
      paidBy: paidBy ?? null,
    },
    include: { shop: true },
  });

  res.json(serializeCollection(updated));
});

export default router;
