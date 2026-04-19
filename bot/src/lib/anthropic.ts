/**
 * Minimal Anthropic Messages API wrapper. We don't take the SDK dep —
 * one fetch call is all we need.
 */

export class AnthropicError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AnthropicError";
  }
}

export interface AnthropicChatOpts {
  apiKey: string;
  model: string;
  system: string;
  userMessage: string;
  maxTokens?: number;
}

export async function anthropicChat(opts: AnthropicChatOpts): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      messages: [{ role: "user", content: opts.userMessage }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new AnthropicError(res.status, `anthropic ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  if (!text) throw new AnthropicError(200, "anthropic returned no text content");
  return text;
}
