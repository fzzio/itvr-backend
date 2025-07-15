import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatRequestBody } from "../types";
import { env } from "../config/env";

const router = Router();

// Ensure the key is set
if (!env.geminiApiKey) {
  throw new Error("GEMINI_API_KEY is not defined in your environment");
}

const genAI = new GoogleGenerativeAI(env.geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * POST /api/chat
 *
 * Body: {
 *   history: ChatHistoryItem[],
 *   question: string
 * }
 */
router.post(
  "/",
  async (req: Request<object, object, ChatRequestBody>, res: Response) => {
    const { history, question } = req.body;

    if (!question) {
      return res
        .status(400)
        .json({ error: "The \"question\" field is required." });
    }

    try {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(question);
      const response = result.response;
      return res.status(200).json({ answer: response.text() });
    } catch (err) {
      console.error("Error communicating with Gemini API:", err);
      return res
        .status(500)
        .json({ error: "Internal server error" });
    }
  }
);

export default router;
