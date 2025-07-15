import { Router, Request, Response } from "express";

import chatRoutes from "./routes/chatRoutes";
import guideRoutes from "./routes/guideRoutes";

import { loggerMiddleware } from "./middlewares/loggerMiddleware";
import { errorHandler } from "./middlewares/errorHandler";

const router = Router();

// 1. Logging (request → console/file/etc)
router.use(loggerMiddleware);

// 2. Health-check
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP" });
});

// 3. Discussion guide endpoints
router.use("/guides", guideRoutes);

// 4. Chat / Gemini endpoints
router.use("/chat", chatRoutes);

// 5. Error handler (must go last)
router.use(errorHandler);

export default router;
