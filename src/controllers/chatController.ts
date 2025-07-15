import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../config/env";
import { ChatRequestBody } from "@/types/chat";

export class ChatController {
  private genAI;
  private model;

  constructor() {
    if (!env.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not defined in your environment");
    }

    this.genAI = new GoogleGenerativeAI(env.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  public sendMessageToGemini = async (req: Request<object, object, ChatRequestBody>, res: Response) => {
      const { history, question } = req.body;

      if (!question) {
        return res
          .status(400)
          .json({ error: "The \"question\" field is required." });
      }

      try {
        const chat = this.model.startChat({ history });
        const result = await chat.sendMessage(question);
        const response = result.response;
        return res.status(200).json({ answer: response.text() });
      } catch (err) {
        console.error("Error communicating with Gemini API:", err);
        return res
          .status(500)
          .json({ error: "Internal server error" });
      }
    };
}

