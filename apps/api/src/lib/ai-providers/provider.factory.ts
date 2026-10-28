import { AiProvider } from "@crm-chatbot/shared-types";
import { AiProviderClient } from "./provider.interface";
import { OpenAiProviderClient } from "./openai.provider";
import { GeminiProviderClient } from "./gemini.provider";

// Resolves the correct provider implementation by name. Adding a new
// provider only requires a new class + a new case here.
export function createAiProviderClient(
  provider: AiProvider,
  modelName: string,
  apiKey: string | null,
): AiProviderClient {
  switch (provider) {
    case "OPENAI":
      return new OpenAiProviderClient(modelName, apiKey);
    case "GEMINI":
      return new GeminiProviderClient(modelName, apiKey);
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Unsupported AI provider: ${exhaustiveCheck}`);
    }
  }
}
