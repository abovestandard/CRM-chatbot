import { FormEvent, useEffect, useState } from "react";
import { AiProvider, AiProviderConfigDto } from "@crm-chatbot/shared-types";
import { aiConfigApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  OPENAI: "gpt-4o-mini",
  GEMINI: "gemini-1.5-flash",
};

export function AiSettingsTab({ websiteId }: { websiteId: string }) {
  const [config, setConfig] = useState<AiProviderConfigDto | null>(null);
  const [provider, setProvider] = useState<AiProvider>("OPENAI");
  const [modelName, setModelName] = useState(DEFAULT_MODELS.OPENAI);
  const [apiKey, setApiKey] = useState("");
  const [allowGeneralKnowledge, setAllowGeneralKnowledge] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    aiConfigApi.get(websiteId).then((c) => {
      setConfig(c);
      setProvider(c.provider);
      setModelName(c.modelName);
      setAllowGeneralKnowledge(c.allowGeneralKnowledge);
      setIsActive(c.isActive);
    });
  }, [websiteId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await aiConfigApi.update(websiteId, {
        provider,
        modelName,
        allowGeneralKnowledge,
        isActive,
        ...(apiKey ? { apiKey } : {}),
      });
      setConfig(updated);
      setApiKey("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>AI model settings</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="provider">Provider</label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => {
              const next = e.target.value as AiProvider;
              setProvider(next);
              setModelName(DEFAULT_MODELS[next]);
            }}
          >
            <option value="OPENAI">OpenAI / ChatGPT</option>
            <option value="GEMINI">Google Gemini</option>
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="model">Model</label>
          <input id="model" value={modelName} onChange={(e) => setModelName(e.target.value)} />
        </div>
        <div className="form-row">
          <label htmlFor="apiKey">
            API key {config?.hasApiKey ? "(already set — leave blank to keep it)" : ""}
          </label>
          <input
            id="apiKey"
            type="password"
            placeholder={config?.hasApiKey ? "••••••••" : "sk-..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>
            <input
              type="checkbox"
              checked={allowGeneralKnowledge}
              onChange={(e) => setAllowGeneralKnowledge(e.target.checked)}
            />{" "}
            Allow the AI to fall back on general knowledge when the website's knowledge base has
            no answer
          </label>
        </div>
        <div className="form-row">
          <label>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />{" "}
            Active
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </div>
  );
}
