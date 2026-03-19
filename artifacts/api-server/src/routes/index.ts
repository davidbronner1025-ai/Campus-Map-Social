import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campusRouter from "./campus";
import locationsRouter from "./locations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campusRouter);
router.use(locationsRouter);

export default router;
