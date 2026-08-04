import { Router, type IRouter } from "express";
import prisma from "../lib/prisma";
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

router.get("/shops", async (req, res): Promise<void> => {
  const query = ListShopsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, page = 1, limit = 10 } = query.data;
  const skip = (Number(page) - 1) * Number(limit);

  const where = search
    ? {
        OR: [
          { shopName: { contains: search } },
          { ownerName: { contains: search } },
          { mobile: { contains: search } },
          { shopId: { contains: search } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.shop.count({ where }),
  ]);

  const shops = data.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  res.json({ data: shops, total, page: Number(page), limit: Number(limit) });
});

router.post("/shops", async (req, res): Promise<void> => {
  const parsed = CreateShopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { shopName, ownerName, mobile, address } = parsed.data;

  // Generate shop ID: BSP0001, BSP0002, etc.
  const count = await prisma.shop.count();
  const shopId = `BSP${String(count + 1).padStart(4, "0")}`;

  const shop = await prisma.shop.create({
    data: { shopId, shopName, ownerName, mobile, address },
  });

  req.log.info({ shopId: shop.shopId }, "Shop created");
  res.status(201).json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.get("/shops/:id", async (req, res): Promise<void> => {
  const params = GetShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const shop = await prisma.shop.findUnique({ where: { id: params.data.id } });
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
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

  const existing = await prisma.shop.findUnique({ where: { id: params.data.id } });
  if (!existing) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  const shop = await prisma.shop.update({
    where: { id: params.data.id },
    data: parsed.data,
  });

  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.delete("/shops/:id", async (req, res): Promise<void> => {
  const params = DeleteShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await prisma.shop.findUnique({ where: { id: params.data.id } });
  if (!existing) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  await prisma.shop.delete({ where: { id: params.data.id } });
  req.log.info({ id: params.data.id }, "Shop deleted");
  res.sendStatus(204);
});

export default router;
