import { AppDataSource } from "../config/database";
import { InterviewSession } from "../entities/InterviewSession";
import { DiscussionGuide } from "../entities/DiscussionGuide";
import { Question } from "../types/guides";
import { AppError } from "../middlewares/errorHandler";

export class SessionService {
  private sessionRepository = AppDataSource.getRepository(InterviewSession);
  private guideRepository = AppDataSource.getRepository(DiscussionGuide);

  async startSession(guideId: number) {
    const guide = await this.guideRepository.findOne({
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

    await this.sessionRepository.save(session);

    return {
      sessionId: session.id,
      currentQuestion: firstQuestion,
    };
  }

  async getSession(sessionId: number) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["guideVersion"],
    });

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    const guideContent = session.guideVersion.content as any;
    const currentQuestion = this.findQuestionById(guideContent.questions, session.state.currentQuestionId);

    return {
      session,
      currentQuestion,
    };
  }

  async submitAnswer(sessionId: number, questionId: string, answer: string) {
    const session = await this.sessionRepository.findOne({
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

    const newAnswer = {
      questionId,
      text: answer,
      timestamp: new Date(),
    };

    session.state.answeredQuestions.push(newAnswer);
    session.state.lastUpdated = new Date();

    const guideContent = session.guideVersion.content as any;
    const nextQuestion = this.findNextQuestion(guideContent.questions, questionId);

    if (nextQuestion) {
      session.state.currentQuestionId = nextQuestion.id;
    } else {
      session.state.currentQuestionId = null;
      session.state.isComplete = true;
    }

    await this.sessionRepository.save(session);

    return {
      nextQuestion,
      isComplete: session.state.isComplete,
    };
  }

  private findQuestionById(questions: Question[], targetId: string | null): Question | null {
    if (!targetId) return null;
    
    for (const question of questions) {
      if (question.id === targetId) {
        return question;
      }
      if (question.subQuestions) {
        const found = this.findQuestionById(question.subQuestions, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  private findNextQuestion(questions: Question[], currentId: string): Question | null {
    let foundCurrent = false;
    
    // Flatten the question hierarchy for sequential access
    const flatQuestions: Question[] = [];
    const flattenQuestions = (qs: Question[]) => {
      for (const q of qs) {
        flatQuestions.push(q);
        if (q.subQuestions) {
          flattenQuestions(q.subQuestions);
        }
      }
    };
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
}
