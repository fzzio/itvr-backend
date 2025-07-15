import { Router } from "express";
import { body } from "express-validator";
import { GuideController } from "../controllers/guideController";

const router = Router();
const guideController = new GuideController();

// Validate discussion guide schema
const validateGuide = [
  body("title").isString().notEmpty().trim(),
  body("description").optional().isString().trim(),
  body("questions").isArray().notEmpty(),
  body("questions.*.id").isString().notEmpty(),
  body("questions.*.text").isString().notEmpty(),
  body("questions.*.subQuestions").optional().isArray(),
];

// Upload/Update discussion guide
router.post("/", validateGuide, guideController.createOrUpdateGuide);

// Get all guides
router.get("/", guideController.getAllGuides);

// Get guide by ID with active version
router.get("/:id", guideController.getGuideById);

// Get guide version history
router.get("/:id/versions", guideController.getGuideVersions);

// Activate specific version
router.post("/:id/versions/:version/activate", guideController.activateVersion);

export default router;
