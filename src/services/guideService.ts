import { AppDataSource } from "../config/database";
import { DiscussionGuide } from "../entities/DiscussionGuide";
import { GuideVersion } from "../entities/GuideVersion";
import { AppError } from "../middlewares/errorHandler";
import { Question } from "../types/guides";

export class GuideService {
  private guideRepository = AppDataSource.getRepository(DiscussionGuide);
  private versionRepository = AppDataSource.getRepository(GuideVersion);

  async createOrUpdateGuide(title: string, description: string | null, questions: Question[]) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let guide = await this.guideRepository.findOne({
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

      // Deactivate previous versions if they exist
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

      return {
        id: guide.id,
        version: guide.currentVersion,
        title: guide.title,
        description: guide.description,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getAllGuides() {
    return this.guideRepository.find({
      select: ["id", "title", "description", "currentVersion", "createdAt", "updatedAt"],
    });
  }

  async getGuideWithActiveVersion(guideId: number) {
    const guide = await this.guideRepository.findOne({
      where: { id: guideId },
      relations: ["versions"],
    });

    if (!guide) {
      throw new AppError("Guide not found", 404);
    }

    const activeVersion = guide.versions.find(v => v.isActive);
    if (!activeVersion) {
      throw new AppError("No active version found", 404);
    }

    return {
      ...guide,
      ...activeVersion.content,
    };
  }

  async getGuideVersions(guideId: number) {
    const versions = await this.versionRepository.find({
      where: { guide: { id: guideId } },
      order: { version: "DESC" },
    });

    if (!versions.length) {
      throw new AppError("Guide not found", 404);
    }

    return versions;
  }

  async activateVersion(guideId: number, versionNumber: number) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deactivate all versions
      await queryRunner.manager
        .createQueryBuilder()
        .update(GuideVersion)
        .set({ isActive: false })
        .where("guide_id = :guideId", { guideId })
        .execute();

      // Activate specified version
      const version = await queryRunner.manager.findOne(GuideVersion, {
        where: {
          guide: { id: guideId },
          version: versionNumber,
        },
      });

      if (!version) {
        throw new AppError("Version not found", 404);
      }

      version.isActive = true;
      await queryRunner.manager.save(version);
      await queryRunner.commitTransaction();

      return { message: "Version activated successfully" };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}