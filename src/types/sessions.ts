export interface Answer {
  questionId: string;
  text: string;
  timestamp: Date;
}

export interface SessionState {
  currentQuestionId: string | null;
  answeredQuestions: Answer[];
  isComplete: boolean;
  lastUpdated: Date;
}

export interface InterviewSession {
  id?: number;
  guideId: number;
  guideVersionId: number;
  state: SessionState;
  createdAt?: Date;
  updatedAt?: Date;
}
