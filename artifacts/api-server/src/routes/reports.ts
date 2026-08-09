import { Router, type IRouter } from "express";
import { getDb } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";
import { GetReportsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth);

function getWeekRange(week: string): { start: string; end: string } {
  // week format: "2024-W01"
  const [yearStr, weekStr] = week.split("-W");
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekStr, 10);

  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));

  const startDate = new Date(startOfWeek1);
  startDate.setDate(startOfWeek1.getDate() + (weekNum - 1) * 7);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(startDate), end: fmt(endDate) };
}

router.get("/reports", async (req, res): Promise<void> => {
  const query = GetReportsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { shopId, week, month, startDate, endDate } = query.data;
  const db = getDb();

  const filter: Record<string, unknown> = {};
  if (shopId) filter.shopId = Number(shopId);

  let dateGte: string | undefined;
  let dateLte: string | undefined;

  if (week) {
    const range = getWeekRange(week);
    dateGte = range.start;
    dateLte = range.end;
  } else if (month) {
    // month format: "2024-01"
    const [yr, mo] = month.split("-");
    const lastDay = new Date(parseInt(yr, 10), parseInt(mo, 10), 0).getDate();
    dateGte = `${month}-01`;
    dateLte = `${month}-${String(lastDay).padStart(2, "0")}`;
  } else {
    if (startDate) dateGte = startDate as string;
    if (endDate) dateLte = endDate as string;
  }

  if (dateGte || dateLte) {
    filter.collectionDate = {
      ...(dateGte ? { $gte: dateGte } : {}),
      ...(dateLte ? { $lte: dateLte } : {}),
    };
  }

  const data = await db.collection("collections")
    .find(filter)
    .sort({ collectionDate: -1, createdAt: -1 })
    .toArray();

  // Fetch shops for each collection
  const shopIds = [...new Set(data.map((c: any) => c.shopId))];
  const shops = await db.collection("shops")
    .find({ id: { $in: shopIds } })
    .toArray();
  const shopMap = new Map(shops.map((s: any) => [s.id, s]));

  let totalKg = 0;
  let totalAmount = 0;
  for (const c of data) {
    totalKg += c.weightKg || 0;
    totalAmount += c.totalAmount || 0;
  }

  const serialized = data.map((c: any) => ({
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
    data: serialized,
    totalKg: Math.round(totalKg * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  });
});

export default router;
