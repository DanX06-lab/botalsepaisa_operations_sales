import { Router, type IRouter } from "express";
import { getDb } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/dashboard", async (_req, res): Promise<void> => {
  const db = getDb();
  
  const [
    totalShops,
    collections,
    pendingPayments,
    recentCollections,
  ] = await Promise.all([
    db.collection("shops").countDocuments(),
    db.collection("collections").find().toArray(),
    db.collection("collections").countDocuments({ paymentStatus: "PENDING" }),
    db.collection("collections")
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
  ]);

  // Calculate totals from collections
  let totalKgCollected = 0;
  let totalAmountPayable = 0;
  for (const c of collections) {
    totalKgCollected += c.weightKg || 0;
    totalAmountPayable += c.totalAmount || 0;
  }

  // Fetch shops for recent collections
  const shopIds = [...new Set(recentCollections.map((c: any) => c.shopId))];
  const shops = await db.collection("shops")
    .find({ id: { $in: shopIds } })
    .toArray();
  const shopMap = new Map(shops.map((s: any) => [s.id, s]));

  const serializedRecent = recentCollections.map((c: any) => ({
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    shop: shopMap.get(c.shopId) ? {
      ...shopMap.get(c.shopId),
      createdAt: shopMap.get(c.shopId).createdAt instanceof Date 
        ? shopMap.get(c.shopId).createdAt.toISOString() 
        : shopMap.get(c.shopId).createdAt
    } : undefined,
  }));

  res.json({
    totalShops,
    totalKgCollected: Math.round(totalKgCollected * 100) / 100,
    totalAmountPayable: Math.round(totalAmountPayable * 100) / 100,
    pendingPayments,
    recentCollections: serializedRecent,
  });
});

export default router;
