import { AiGenerateParams, AiGenerateResult, AiProviderClient } from "./provider.interface";
import { noKnowledgeResponse } from "./no-knowledge-response";
import { buildSystemPrompt, buildUserContent, parseModelOutput } from "./prompt";

export class GeminiProviderClient implements AiProviderClient {
  constructor(
    private readonly modelName: string,
    private readonly apiKey: string | null,
  ) {}

  async generateResponse(params: AiGenerateParams): Promise<AiGenerateResult> {
    if (params.context.length === 0 && !params.allowGeneralKnowledge) {
      return noKnowledgeResponse();
    }
    if (!this.apiKey) {
      throw new Error("Gemini API key is not configured for this website. Add one in AI Settings.");
    }

    // @google/genai is ESM-only; dynamic import lets this CommonJS module load it.
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [
        ...params.history.map((m) => ({
          role: m.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: [{ text: m.content }],
        })),
        { role: "user" as const, parts: [{ text: buildUserContent(params) }] },
      ],
      config: { systemInstruction: buildSystemPrompt(params.allowGeneralKnowledge) },
    });

    return parseModelOutput(response.text ?? "");
  }
}
