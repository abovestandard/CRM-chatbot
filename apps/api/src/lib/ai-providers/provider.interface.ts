export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiGenerateParams {
  /** Retrieved knowledge chunks (website content, documents, URLs) relevant to the question. Phase 2. */
  context: string[];
  /** Prior turns of the current conversation. */
  history: AiChatMessage[];
  /** The visitor's latest message. */
  question: string;
  /** Whether the provider may fall back to general knowledge when context is insufficient. */
  allowGeneralKnowledge: boolean;
}

export interface AiGenerateResult {
  answer: string;
  /** Suggested follow-up questions/options for the visitor, per spec section 9. */
  suggestions: string[];
}

// Every AI provider (OpenAI, Gemini, future providers) implements this
// interface so the chat module never depends on a specific vendor SDK.
export interface AiProviderClient {
  generateResponse(params: AiGenerateParams): Promise<AiGenerateResult>;
}
