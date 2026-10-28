import { AiGenerateParams, AiGenerateResult } from "./provider.interface";

// Neither provider API returns structured follow-up suggestions natively, so
// we ask the model to emit them as a trailing convention line and parse it
// back out. Keeping this convention shared means both providers behave
// identically from the chat module's point of view.
const SUGGESTIONS_INSTRUCTION = `After your answer, on a new line, output exactly one line starting with "SUGGESTIONS:" followed by 2-3 short,
comma-separated follow-up questions or options the visitor might want next. Do not repeat that line elsewhere.`;

export function buildSystemPrompt(allowGeneralKnowledge: boolean): string {
  const groundingRule = allowGeneralKnowledge
    ? "Website context is provided below when available — prioritize it, but you may use general knowledge to fill gaps."
    : "Only answer using the website context provided below. If it doesn't contain the answer, say plainly that you " +
      "don't have that information from this website's knowledge base — do not use outside knowledge or guess.";

  return `You are a helpful AI assistant embedded on a website, answering visitor questions.
Be clear, accurate, and concise. ${groundingRule}
${SUGGESTIONS_INSTRUCTION}`;
}

export function buildUserContent(params: AiGenerateParams): string {
  if (params.context.length === 0) {
    return params.question;
  }
  return `Relevant website context:\n${params.context.join("\n---\n")}\n\nQuestion: ${params.question}`;
}

export function parseModelOutput(raw: string): AiGenerateResult {
  const marker = "SUGGESTIONS:";
  const idx = raw.lastIndexOf(marker);
  if (idx === -1) {
    return { answer: raw.trim(), suggestions: [] };
  }

  const answer = raw.slice(0, idx).trim();
  const suggestions = raw
    .slice(idx + marker.length)
    .trim()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return { answer: answer || "Here's what I found.", suggestions };
}
