import { Router, Request, Response } from "express";
import { ChatController } from "../controllers/chatController";

const router = Router({ mergeParams: true });
const chatController = new ChatController();

/**
 * POST /api/chat
 *
 * Body: {
 *   history: ChatHistoryItem[],
 *   question: string
 * }
 */
router.post("/", chatController.sendMessageToGemini);

export default router;
