import { Router } from "express";
import { body, validationResult } from "express-validator";
import { AppError } from "../middlewares/errorHandler";
import { AppDataSource } from "../config/database";
import { InterviewSession } from "../entities/InterviewSession";
import { DiscussionGuide } from "../entities/DiscussionGuide";
import { GuideVersion } from "../entities/GuideVersion";
import { Question } from "../types/guides";
import { SessionState } from "../types/sessions";

const router = Router();

// Start a new interview session
router.post("/", [
  body("guideId").isInt().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Invalid request format", 400);
    }

    const { guideId } = req.body;

    // Get guide and active version
    const guide = await AppDataSource.manager.findOne(DiscussionGuide, {
      where: { id: guideId },
      relations: ["versions"],
    });

    if (!guide) {
      throw new AppError("Guide not found", 404);
    }

    const activeVersion = guide.versions.find(v => v.isActive);
    if (!activeVersion) {
      throw new AppError("No active version found for guide", 404);
    }

    const guideContent = activeVersion.content as any;
    const firstQuestion = guideContent.questions[0];

    // Create new session
    const session = new InterviewSession();
    session.guide = guide;
    session.guideId = guide.id;
    session.guideVersion = activeVersion;
    session.guideVersionId = activeVersion.id;
    session.state = {
      currentQuestionId: firstQuestion.id,
      answeredQuestions: [],
      isComplete: false,
      lastUpdated: new Date(),
    };

    await AppDataSource.manager.save(session);

    res.status(201).json({
      sessionId: session.id,
      currentQuestion: firstQuestion,
    });
  } catch (error) {
    next(error);
  }
});

// Get current session state
router.get("/:id", async (req, res, next) => {
  try {
    const session = await AppDataSource.manager.findOne(InterviewSession, {
      where: { id: parseInt(req.params.id) },
      relations: ["guideVersion"],
    });

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    const guideContent = session.guideVersion.content as any;
    const currentQuestion = findQuestionById(guideContent.questions, session.state.currentQuestionId);

    res.json({
      session,
      currentQuestion,
    });
  } catch (error) {
    next(error);
  }
});

// Submit answer and get next question
router.post("/:id/answer", [
  body("questionId").isString().notEmpty(),
  body("answer").isString().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Invalid answer format", 400);
    }

    const { questionId, answer } = req.body;
    const sessionId = parseInt(req.params.id);

    const session = await AppDataSource.manager.findOne(InterviewSession, {
      where: { id: sessionId },
      relations: ["guideVersion"],
    });

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    if (session.state.isComplete) {
      throw new AppError("Session is already complete", 400);
    }

    if (session.state.currentQuestionId !== questionId) {
      throw new AppError("Invalid question ID", 400);
    }

    // Record the answer
    const newAnswer = {
      questionId,
      text: answer,
      timestamp: new Date(),
    };

    session.state.answeredQuestions.push(newAnswer);
    session.state.lastUpdated = new Date();

    // Find next question
    const guideContent = session.guideVersion.content as any;
    const nextQuestion = findNextQuestion(guideContent.questions, questionId);

    if (nextQuestion) {
      session.state.currentQuestionId = nextQuestion.id;
    } else {
      session.state.currentQuestionId = null;
      session.state.isComplete = true;
    }

    await AppDataSource.manager.save(session);

    res.json({
      nextQuestion,
      isComplete: session.state.isComplete,
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to find a question by ID
function findQuestionById(questions: Question[], targetId: string | null): Question | null {
  if (!targetId) return null;

  for (const question of questions) {
    if (question.id === targetId) {
      return question;
    }
    if (question.subQuestions) {
      const found = findQuestionById(question.subQuestions, targetId);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to find the next question
function findNextQuestion(questions: Question[], currentId: string): Question | null {
  let foundCurrent = false;

  // Flatten the question hierarchy for sequential access
  const flatQuestions: Question[] = [];
  function flattenQuestions(qs: Question[]) {
    for (const q of qs) {
      flatQuestions.push(q);
      if (q.subQuestions) {
        flattenQuestions(q.subQuestions);
      }
    }
  }
  flattenQuestions(questions);

  // Find the next question after the current one
  for (let i = 0; i < flatQuestions.length; i++) {
    if (foundCurrent) {
      return flatQuestions[i];
    }
    if (flatQuestions[i].id === currentId) {
      foundCurrent = true;
    }
  }

  return null;
}

export default router;
