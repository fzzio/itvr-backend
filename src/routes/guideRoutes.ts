import { Router } from "express";
import { body, validationResult } from "express-validator";
import { AppError } from "../middlewares/errorHandler";
import { AppDataSource } from "../config/database";
import { DiscussionGuide } from "../entities/DiscussionGuide";
import { GuideVersion } from "../entities/GuideVersion";
import { Question } from "../types/guides";

const router = Router();

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
router.post("/", validateGuide, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Invalid guide format", 400);
    }

    const { title, description, questions } = req.body;

    // Start transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create or update guide
      let guide = await queryRunner.manager.findOne(DiscussionGuide, {
        where: { title },
        relations: ["versions"],
      });

      if (!guide) {
        guide = new DiscussionGuide();
        guide.title = title;
        guide.description = description;
        guide.currentVersion = 1;
        guide.versions = [];
      } else {
        guide.currentVersion += 1;
        guide.description = description;
      }

      await queryRunner.manager.save(guide);

      // Create new version
      const guideVersion = new GuideVersion();
      guideVersion.guide = guide;
      guideVersion.version = guide.currentVersion;
      guideVersion.content = {
        title,
        description,
        questions,
        version: guide.currentVersion,
      };

      // If this is an update, deactivate previous versions
      if (guide.versions.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(GuideVersion)
          .set({ isActive: false })
          .where("guide_id = :guideId", { guideId: guide.id })
          .execute();
      }

      await queryRunner.manager.save(guideVersion);
      await queryRunner.commitTransaction();

      res.status(201).json({
        id: guide.id,
        version: guide.currentVersion,
        title: guide.title,
        description: guide.description,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    next(error);
  }
});

// Get all guides
router.get("/", async (req, res, next) => {
  try {
    const guides = await AppDataSource.manager.find(DiscussionGuide, {
      select: ["id", "title", "description", "currentVersion", "createdAt", "updatedAt"],
    });
    res.json(guides);
  } catch (error) {
    next(error);
  }
});

// Get guide by ID with active version
router.get("/:id", async (req, res, next) => {
  try {
    const guide = await AppDataSource.manager.findOne(DiscussionGuide, {
      where: { id: parseInt(req.params.id) },
      relations: ["versions"],
    });

    if (!guide) {
      throw new AppError("Guide not found", 404);
    }

    const activeVersion = guide.versions.find(v => v.isActive);
    if (!activeVersion) {
      throw new AppError("No active version found", 404);
    }

    res.json({
      ...guide,
      ...activeVersion.content,
    });
  } catch (error) {
    next(error);
  }
});

// Get guide version history
router.get("/:id/versions", async (req, res, next) => {
  try {
    const versions = await AppDataSource.manager.find(GuideVersion, {
      where: { guide: { id: parseInt(req.params.id) } },
      order: { version: "DESC" },
    });

    if (!versions.length) {
      throw new AppError("Guide not found", 404);
    }

    res.json(versions);
  } catch (error) {
    next(error);
  }
});

// Activate specific version
router.post("/:id/versions/:version/activate", async (req, res, next) => {
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deactivate all versions
      await queryRunner.manager
        .createQueryBuilder()
        .update(GuideVersion)
        .set({ isActive: false })
        .where("guide_id = :guideId", { guideId: parseInt(req.params.id) })
        .execute();

      // Activate specified version
      const version = await queryRunner.manager.findOne(GuideVersion, {
        where: {
          guide: { id: parseInt(req.params.id) },
          version: parseInt(req.params.version),
        },
      });

      if (!version) {
        throw new AppError("Version not found", 404);
      }

      version.isActive = true;
      await queryRunner.manager.save(version);

      await queryRunner.commitTransaction();
      res.json({ message: "Version activated successfully" });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    next(error);
  }
});

export default router;
