import { Router, type IRouter } from "express";
import healthRouter from "./health";
import heroRouter from "./hero";

const router: IRouter = Router();

router.use(healthRouter);
router.use(heroRouter);

export default router;
