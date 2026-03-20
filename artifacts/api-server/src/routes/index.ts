import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campusRouter from "./campus";
import locationsRouter from "./locations";
import authRouter from "./auth";
import usersRouter from "./users";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campusRouter);
router.use(locationsRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(messagesRouter);

export default router;
