/**
 * OpenAI-compatible LLM client using native fetch.
 * Supports any provider that implements the /v1/chat/completions endpoint.
 */

const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://newapi.deepwisdom.ai/v1";
const LLM_MODEL = process.env.LLM_MODEL || "claude-sonnet-4-20250514";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024,
): Promise<string> {
  if (!LLM_API_KEY) {
    throw new Error("LLM_API_KEY environment variable is required");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content || "";
}
