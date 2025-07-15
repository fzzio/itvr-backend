import { AppDataSource } from "../config/database";
import { InterviewSession } from "../entities/InterviewSession";
import { DiscussionGuide } from "../entities/DiscussionGuide";
import { Question, DiscussionGuide as GuideContent } from "../types/guides";
import { Answer, FollowUpPrompt } from "../types/followUps";
import { AppError } from "../middlewares/errorHandler";
import { ChatService } from "./chatService";

export class SessionService {
  private sessionRepository = AppDataSource.getRepository(InterviewSession);
  private guideRepository = AppDataSource.getRepository(DiscussionGuide);
  private chatService = new ChatService();

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

    const guideContent = activeVersion.content as GuideContent;
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

    const guideContent = session.guideVersion.content as GuideContent;
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

    const guideContent = session.guideVersion.content as GuideContent;
    const currentQuestion = this.findQuestionById(guideContent.questions, questionId);

    if (!currentQuestion) {
      throw new AppError("Question not found", 404);
    }

    // Validate answer meaningfulness
    if (!answer || answer.trim().length === 0) {
      throw new AppError("Answer cannot be empty", 400);
    }

    const minWords = 3; // Minimum words for a meaningful answer
    const words = answer.trim().split(/\s+/);
    if (words.length < minWords) {
      throw new AppError(`Answer must contain at least ${minWords} words for a meaningful response`, 400);
    }

    // Check if the answer seems like a deflection or non-answer
    const deflectionPatterns = [
      /^what about/i,
      /^why do you/i,
      /^i don't know$/i,
      /^no idea$/i,
      /^maybe$/i,
      /^not sure$/i,
      /^\?+$/,  // Just question marks
      /^(yes|no)$/i, // Single word yes/no
    ];

    if (deflectionPatterns.some(pattern => pattern.test(answer.trim()))) {
      throw new AppError("Please provide a more detailed and direct answer to the question", 400);
    }

    // Create the answer object and generate follow-ups
    const answerObj: Answer = {
      questionId,
      text: answer,
      timestamp: new Date(),
    };

    // Generate follow-ups if the question has rules
    if (currentQuestion.followUpRules && currentQuestion.followUpRules.length > 0) {
      const previousContext = currentQuestion.contextIncluded
        ? session.state.answeredQuestions.map(a => {
            const q = this.findQuestionById(guideContent.questions, a.questionId);
            return q ? { question: q.text, answer: a.text } : null;
          }).filter((ctx): ctx is { question: string; answer: string } => ctx !== null)
        : [];

      const followUps = await this.chatService.generateFollowUps(
        currentQuestion,
        answerObj,
        previousContext
      );

      if (followUps.length > 0) {
        answerObj.followUps = followUps;
      }
    }

    session.state.answeredQuestions.push(answerObj);
    session.state.lastUpdated = new Date();

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
