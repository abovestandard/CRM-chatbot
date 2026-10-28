import { AiGenerateResult } from "./provider.interface";

// Spec section 8/11: if there's no relevant knowledge and the website hasn't
// opted into general AI knowledge, say so plainly instead of calling the
// model and risking a hallucinated answer.
export function noKnowledgeResponse(): AiGenerateResult {
  return {
    answer:
      "I don't have enough information from this website's knowledge base to answer that yet. " +
      "An admin can enable general AI knowledge in AI Settings, or add relevant documents/URLs.",
    suggestions: ["Ask something else", "Contact support"],
  };
}
