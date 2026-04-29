import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import problemsRouter from "./problems";
import submissionsRouter from "./submissions";
import queueRouter from "./queue";
import battlesRouter from "./battles";
import leaderboardRouter from "./leaderboard";
import seasonsRouter from "./seasons";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(problemsRouter);
router.use(submissionsRouter);
router.use(queueRouter);
router.use(battlesRouter);
router.use(leaderboardRouter);
router.use(seasonsRouter);

export default router;
