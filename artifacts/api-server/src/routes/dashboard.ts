import { Router, type IRouter } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [
    totalShops,
    collectionsAgg,
    pendingAgg,
    recentCollections,
  ] = await Promise.all([
    prisma.shop.count(),
    prisma.collection.aggregate({
      _sum: { weightKg: true, totalAmount: true },
    }),
    prisma.collection.count({ where: { paymentStatus: "PENDING" } }),
    prisma.collection.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { shop: true },
    }),
  ]);

  const serializedRecent = recentCollections.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    shop: { ...c.shop, createdAt: c.shop.createdAt.toISOString() },
  }));

  res.json({
    totalShops,
    totalKgCollected: Math.round((collectionsAgg._sum.weightKg ?? 0) * 100) / 100,
    totalAmountPayable: Math.round((collectionsAgg._sum.totalAmount ?? 0) * 100) / 100,
    pendingPayments: pendingAgg,
    recentCollections: serializedRecent,
  });
});

export default router;
