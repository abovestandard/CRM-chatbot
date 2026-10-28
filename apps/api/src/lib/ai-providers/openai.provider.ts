import OpenAI from "openai";
import { AiGenerateParams, AiGenerateResult, AiProviderClient } from "./provider.interface";
import { noKnowledgeResponse } from "./no-knowledge-response";
import { buildSystemPrompt, buildUserContent, parseModelOutput } from "./prompt";

export class OpenAiProviderClient implements AiProviderClient {
  constructor(
    private readonly modelName: string,
    private readonly apiKey: string | null,
  ) {}

  async generateResponse(params: AiGenerateParams): Promise<AiGenerateResult> {
    if (params.context.length === 0 && !params.allowGeneralKnowledge) {
      return noKnowledgeResponse();
    }
    if (!this.apiKey) {
      throw new Error("OpenAI API key is not configured for this website. Add one in AI Settings.");
    }

    const client = new OpenAI({ apiKey: this.apiKey });

    const completion = await client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: "system", content: buildSystemPrompt(params.allowGeneralKnowledge) },
        ...params.history.map((m) => ({ role: m.role, content: m.content }) as const),
        { role: "user" as const, content: buildUserContent(params) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    return parseModelOutput(raw);
  }
}
