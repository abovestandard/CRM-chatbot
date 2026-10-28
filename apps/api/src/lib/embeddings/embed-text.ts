import OpenAI from "openai";
import { AiProvider } from "@crm-chatbot/shared-types";

// Separate from the chat model configured in AI Settings — embeddings use
// their own purpose-built models regardless of which chat model is selected.
export const EMBEDDING_MODELS: Record<AiProvider, string> = {
  OPENAI: "text-embedding-3-small",
  GEMINI: "gemini-embedding-001",
};

export async function embedText(provider: AiProvider, apiKey: string, text: string): Promise<number[]> {
  switch (provider) {
    case "OPENAI": {
      const client = new OpenAI({ apiKey });
      const res = await client.embeddings.create({ model: EMBEDDING_MODELS.OPENAI, input: text });
      return res.data[0].embedding;
    }
    case "GEMINI": {
      // @google/genai is ESM-only; dynamic import lets this CommonJS module load it.
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.embedContent({ model: EMBEDDING_MODELS.GEMINI, contents: text });
      const values = res.embeddings?.[0]?.values;
      if (!values) {
        throw new Error("Gemini returned no embedding values");
      }
      return values;
    }
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Unsupported embedding provider: ${exhaustiveCheck}`);
    }
  }
}
