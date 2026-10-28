import { prisma } from "../../db/prisma";
import { decryptSecret } from "../../lib/crypto";
import { createAiProviderClient } from "../../lib/ai-providers/provider.factory";
import { retrieveRelevantChunks } from "../../lib/retrieval/semantic-search";
import { ChatResponse } from "@crm-chatbot/shared-types";

export class AiProviderCallError extends Error {}

// Shared by the admin "Test Chat" screen and the public embeddable widget —
// both need identical session handling, retrieval, and provider dispatch;
// only auth/access-control differs between the two callers.
export async function runChatTurn(params: {
  websiteId: string;
  visitorId: string;
  sessionId?: string;
  message: string;
}): Promise<ChatResponse> {
  const { websiteId, visitorId, message } = params;

  const session = params.sessionId
    ? await prisma.chatSession.findFirst({
        where: { id: params.sessionId, websiteId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  const activeSession =
    session ??
    (await prisma.chatSession.create({
      data: { websiteId, visitorId },
      include: { messages: true },
    }));

  await prisma.chatMessage.create({
    data: { sessionId: activeSession.id, role: "USER", content: message },
  });

  const config = await prisma.aiProviderConfig.findUnique({ where: { websiteId } });
  const provider = config?.provider ?? "OPENAI";
  const modelName = config?.modelName ?? "gpt-4o-mini";
  const allowGeneralKnowledge = config?.allowGeneralKnowledge ?? false;

  const apiKey = config?.apiKeyEncrypted ? decryptSecret(config.apiKeyEncrypted) : null;
  const client = createAiProviderClient(provider, modelName, apiKey);
  const history = (session?.messages ?? []).map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const context = await retrieveRelevantChunks(websiteId, message, provider, apiKey);

  let result;
  try {
    result = await client.generateResponse({ context, history, question: message, allowGeneralKnowledge });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI provider request failed";
    throw new AiProviderCallError(message);
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: { sessionId: activeSession.id, role: "ASSISTANT", content: result.answer },
  });

  await prisma.usageEvent.create({
    data: { websiteId, eventType: "chat_message", metadata: { sessionId: activeSession.id } },
  });

  return {
    sessionId: activeSession.id,
    message: {
      role: "ASSISTANT",
      content: assistantMessage.content,
      createdAt: assistantMessage.createdAt.toISOString(),
    },
    suggestions: result.suggestions,
  };
}
