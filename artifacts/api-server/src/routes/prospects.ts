import { Router, type IRouter } from "express";
import { getDb, generateProspectId } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";
import {
  ListProspectsQueryParams,
  CreateProspectBody,
  ConvertProspectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth);

function serializeProspect(s: any) {
  return {
    ...s,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  };
}

router.get("/prospects", async (req, res): Promise<void> => {
  const query = ListProspectsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { zone } = query.data;
  const db = getDb();

  const filter: Record<string, unknown> = {};
  if (zone) {
    filter.zone = zone;
  }

  const data = await db.collection("prospects")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  const prospects = data.map(serializeProspect);

  res.json(prospects);
});

router.post("/prospects", async (req, res): Promise<void> => {
  const parsed = CreateProspectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, address, zone, latitude, longitude } = parsed.data;

  const db = getDb();
  const prospectId = await generateProspectId();
  const idDoc = await db.collection("counters").findOneAndUpdate(
    { name: "prospectId" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const numericId = idDoc ? idDoc.value : 1;

  const prospect = {
    id: numericId,
    prospectId,
    name,
    address,
    zone,
    status: "PENDING",
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    createdAt: new Date()
  };

  await db.collection("prospects").insertOne(prospect);
  req.log.info({ prospectId, name, zone }, "Prospect created");
  res.status(201).json(serializeProspect(prospect));
});

router.put("/prospects/:id/convert", async (req, res): Promise<void> => {
  const params = ConvertProspectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const existing = await db.collection("prospects").findOne({ id: params.data.id });
  if (!existing) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }

  const updated = await db.collection("prospects").findOneAndUpdate(
    { id: params.data.id },
    { $set: { status: "CONVERTED" } },
    { returnDocument: "after" }
  );

  req.log.info({ id: params.data.id }, "Prospect converted");
  res.json(serializeProspect(updated));
});

export default router;
