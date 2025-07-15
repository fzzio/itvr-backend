export interface FollowUpRule {
  // Define conditions that trigger this follow-up
  condition: {
    type: "keywords" | "sentiment" | "length";
    value: string | string[] | number; // Keywords array, sentiment threshold, or length threshold
  };
  // The prompt template to use when generating the follow-up
  promptTemplate: string;
  // Maximum number of follow-ups to generate (-1 for unlimited)
  maxFollowUps: number;
}

export interface FollowUpPrompt {
  questionId: string;
  prompt: string;
  generatedAt: Date;
  sourceAnswer: string;
  ruleId?: string;
}

// Updates to Question type
export interface Question {
  id: string;
  text: string;
  subQuestions?: Question[];
  followUpRules?: FollowUpRule[];
  contextIncluded?: boolean; // Whether to include previous Q&A context when asking follow-ups
}

export interface Answer {
  questionId: string;
  text: string;
  timestamp: Date;
  followUps?: FollowUpPrompt[];
}
