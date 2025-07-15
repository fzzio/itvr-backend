export interface Question {
  id: string;
  text: string;
  subQuestions?: Question[];
}

export interface DiscussionGuide {
  id?: number;
  version: number;
  title: string;
  description?: string;
  questions: Question[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GuideVersion {
  id: number;
  guideId: number;
  version: number;
  content: DiscussionGuide;
  createdAt: Date;
  isActive: boolean;
}
