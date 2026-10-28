import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export async function fetchAndExtractUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "AI-Chatbot-CRM/1.0 (+content indexer)" },
  });

  if (!res.ok) {
    throw new Error(`Fetching URL failed with status ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new Error(`Unsupported content type for indexing: ${contentType || "unknown"}`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("Page content exceeds the 5MB indexing limit");
  }

  const html = Buffer.from(buffer).toString("utf-8");
  if (contentType.includes("text/plain")) {
    return html.trim();
  }

  const $ = cheerio.load(html);
  // Only strip non-content elements. Real contact info (phone, email,
  // address) commonly lives in the footer, so it must stay indexable.
  $("script, style, noscript, svg").remove();
  const text = $("body").text();

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
