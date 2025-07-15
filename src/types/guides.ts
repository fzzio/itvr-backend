import { FollowUpRule } from "./followUps";

export interface Question {
  id: string;
  text: string;
  subQuestions?: Question[];
  followUpRules?: FollowUpRule[];
  contextIncluded?: boolean; // Whether to include previous Q&A context when asking follow-ups
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
