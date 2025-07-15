import { Router } from "express";
import { body } from "express-validator";
import { SessionController } from "../controllers/sessionController";

const router = Router();
const sessionController = new SessionController();

// Start a new interview session
router.post("/", [
  body("guideId").isInt().notEmpty(),
], sessionController.startSession);

// Get current session state
router.get("/:id", sessionController.getSession);

// Submit answer and get next question
router.post("/:id/answer", [
  body("questionId").isString().notEmpty(),
  body("answer").isString().notEmpty(),
], sessionController.submitAnswer);

export default router;
