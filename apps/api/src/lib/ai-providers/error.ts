// Some provider SDKs (notably @google/genai on a non-2xx response) throw an
// Error whose `message` is the raw JSON error body rather than plain text.
// Unwrap that so the CRM UI shows a readable sentence instead of a JSON blob.
export function extractProviderErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return "AI provider request failed";
  }

  try {
    const parsed = JSON.parse(err.message);
    const nested = parsed?.error?.message;
    if (typeof nested === "string") {
      return nested;
    }
  } catch {
    // Not JSON — fall through to the raw message.
  }

  return err.message;
}
