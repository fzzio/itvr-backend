export interface ChatHistoryPart {
  text: string;
}

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: ChatHistoryPart[];
}

export interface ChatRequestBody {
  history: ChatHistoryItem[];
  question: string;
}
