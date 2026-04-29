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
import replaysRouter from "./replays";
import missionsRouter from "./missions";
import socialRouter from "./social";
import mentorRouter from "./mentor";
import hiringRouter from "./hiring";
import bossesRouter from "./bosses";
import analyticsRouter from "./analytics";

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
router.use(replaysRouter);
router.use(missionsRouter);
router.use(socialRouter);
router.use(mentorRouter);
router.use(hiringRouter);
router.use(bossesRouter);
router.use(analyticsRouter);

export default router;
