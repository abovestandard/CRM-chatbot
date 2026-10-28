import { FormEvent, useState } from "react";
import { ChatMessageDto } from "@crm-chatbot/shared-types";
import { chatApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

export function TestChatTab({ websiteId }: { websiteId: string }) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setError(null);
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: "USER", content: text, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    try {
      const res = await chatApi.send(websiteId, { sessionId, message: text });
      setSessionId(res.sessionId);
      setMessages((prev) => [...prev, res.message]);
      setSuggestions(res.suggestions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chat request failed");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="card">
      <h3>Test chat</h3>
      <p style={{ color: "#666", fontSize: 14 }}>
        This calls the real chat endpoint, but Phase 2 wires up actual OpenAI/Gemini calls and
        website knowledge retrieval — for now responses are mocked.
      </p>

      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === "USER" ? "user" : "assistant"}`}>
            {m.content}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => sendMessage(s)} disabled={sending}>
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={sending}
        />
        <button type="submit" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
