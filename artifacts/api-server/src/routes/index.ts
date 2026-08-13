import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import shopsRouter from "./shops";
import collectionsRouter from "./collections";
import reportsRouter from "./reports";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import routesRouter from "./routes";
import prospectsRouter from "./prospects";
import intelligenceRouter from "./intelligence";
import whatsappRouter from "./whatsapp";
import pickupsRouter from "./pickups";

import intelligenceImportRouter from "./intelligence-import";
import intelligenceDiscoveryRouter from "./intelligence-discovery";
import intelligenceMapRouter from "./intelligence-map";
import { intelligenceCoverageRouter } from "./intelligence-coverage";
import { intelligenceVerificationRouter } from "./intelligence-verification";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(shopsRouter);
router.use(collectionsRouter);
router.use(reportsRouter);
router.use(settingsRouter);
router.use(dashboardRouter);
router.use(routesRouter);
router.use(prospectsRouter);
router.use(intelligenceRouter);
router.use(intelligenceImportRouter);
router.use(intelligenceDiscoveryRouter);
router.use(intelligenceMapRouter);
router.use("/intelligence/coverage", intelligenceCoverageRouter);
router.use("/intelligence/verification", intelligenceVerificationRouter);
router.use(whatsappRouter);
router.use(pickupsRouter);

export default router;
