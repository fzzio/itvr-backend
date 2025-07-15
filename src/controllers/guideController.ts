import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { GuideService } from "../services/guideService";
import { AppError } from "../middlewares/errorHandler";

export class GuideController {
  private guideService = new GuideService();

  createOrUpdateGuide = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError("Invalid guide format", 400);
      }

      const { title, description, questions } = req.body;
      const result = await this.guideService.createOrUpdateGuide(title, description, questions);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAllGuides = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guides = await this.guideService.getAllGuides();
      res.json(guides);
    } catch (error) {
      next(error);
    }
  };

  getGuideById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guide = await this.guideService.getGuideWithActiveVersion(parseInt(req.params.id));
      res.json(guide);
    } catch (error) {
      next(error);
    }
  };

  getGuideVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const versions = await this.guideService.getGuideVersions(parseInt(req.params.id));
      res.json(versions);
    } catch (error) {
      next(error);
    }
  };

  activateVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.guideService.activateVersion(
        parseInt(req.params.id),
        parseInt(req.params.version)
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
