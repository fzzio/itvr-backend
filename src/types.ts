// Define la estructura de un solo ítem en el historial de chat,
// tal como lo espera la API de Gemini.
export interface ChatHistoryPart {
  text: string;
}

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: ChatHistoryPart[];
}

// Define la estructura del cuerpo (body) de la petición POST que recibirá tu API.
export interface ChatRequestBody {
  history: ChatHistoryItem[];
  question: string;
}
