import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { SessionService } from "../services/sessionService";
import { AppError } from "../middlewares/errorHandler";

export class SessionController {
  private sessionService = new SessionService();

  startSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError("Invalid request format", 400);
      }

      const { guideId } = req.body;
      const result = await this.sessionService.startSession(guideId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.sessionService.getSession(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  submitAnswer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError("Invalid answer format", 400);
      }

      const { questionId, answer } = req.body;
      const sessionId = parseInt(req.params.id);
      const result = await this.sessionService.submitAnswer(sessionId, questionId, answer);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
