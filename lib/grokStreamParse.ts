/**
 * Parse Grok (xAI OpenAI-compatible) `chat/completions` streaming responses.
 * Each SSE event carries a delta content string (non-cumulative).
 */

type ChatCompletionChunk = {
  choices?: Array<{
    delta?: { content?: string; role?: string };
    finish_reason?: string | null;
  }>;
};

export function extractDeltaContent(json: unknown): string {
  const o = json as ChatCompletionChunk;
  return o.choices?.[0]?.delta?.content ?? "";
}

/**
 * Iterate over text deltas from an OpenAI-compatible SSE stream.
 * Format: `data: {...}\n\n` with `data: [DONE]` as sentinel.
 */
export async function* iterateGrokSseTextDeltas(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let carry = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });

    while (true) {
      const m = carry.match(/\r?\n/);
      if (!m || m.index === undefined) break;
      const rawLine = carry.slice(0, m.index);
      carry = carry.slice(m.index + m[0].length);
      const line = rawLine.trim();
      if (!line || line.startsWith(":")) continue;

      const payload = line.startsWith("data: ") ? line.slice(6).trim() : line;
      if (!payload || payload === "[DONE]") continue;

      let json: unknown;
      try {
        json = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = extractDeltaContent(json);
      if (delta) yield delta;
    }
  }
}
