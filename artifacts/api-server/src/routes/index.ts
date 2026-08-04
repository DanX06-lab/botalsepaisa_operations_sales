import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import shopsRouter from "./shops";
import collectionsRouter from "./collections";
import reportsRouter from "./reports";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(shopsRouter);
router.use(collectionsRouter);
router.use(reportsRouter);
router.use(settingsRouter);
router.use(dashboardRouter);

export default router;
