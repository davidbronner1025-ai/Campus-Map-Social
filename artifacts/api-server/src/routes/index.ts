import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campusRouter from "./campus";
import locationsRouter from "./locations";
import authRouter from "./auth";
import replitAuthRouter from "./replit-auth";
import usersRouter from "./users";
import messagesRouter from "./messages";
import eventsRouter from "./events";
import chatRouter from "./chat";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import issuesRouter from "./issues";
import shopsRouter from "./shops";
import bulletinRouter from "./bulletin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campusRouter);
router.use(locationsRouter);
router.use(authRouter);
router.use(replitAuthRouter);
router.use(usersRouter);
router.use(messagesRouter);
router.use(eventsRouter);
router.use(chatRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(issuesRouter);
router.use(shopsRouter);
router.use(bulletinRouter);

export default router;
