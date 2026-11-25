import { ChatRecommendation } from "src/types/Chatbot";

export type MobileLlmConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type MobileLlmResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

type ParsedRecommendationPayload = {
  reply: string;
  recommendations: ChatRecommendation[];
};

export const MOBILE_LLM_STORAGE_KEY = "nebulastream.mobile-llm-url";
export const MOBILE_LLM_DEFAULT_URL =
  import.meta.env.VITE_APP_MOBILE_LLM_URL ?? "";
export const MOBILE_LLM_RETRY_INTERVAL_MS = 15000;

const systemPrompt = [
  "You are Nebula AI, a concise movie recommendation assistant for NebulaStream.",
  "Help the user find movies that match their mood, energy, genre, age group, or watch context.",
  "Return valid JSON only.",
  'Use this shape: {"reply":"short natural answer","recommendations":[{"title":"movie title","reason":"why it fits","mood":"optional short mood label","yearHint":"optional year or era"}]}',
  "Give 2 to 4 movie recommendations.",
  "Do not wrap JSON in markdown.",
].join(" ");

function joinContent(
  content: string | Array<{ type?: string; text?: string }> | undefined
) {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  return content
    .map((item) => item.text ?? "")
    .join("")
    .trim();
}

function extractJsonObject(content: string) {
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return content.slice(firstBrace, lastBrace + 1);
}

function normalizeRecommendation(
  item: Partial<ChatRecommendation> | null | undefined
): ChatRecommendation | null {
  if (!item?.title) {
    return null;
  }

  return {
    title: item.title.trim(),
    reason: item.reason?.trim() || "A strong fit for what you asked for.",
    mood: item.mood?.trim(),
    yearHint: item.yearHint?.trim(),
  };
}

function parseRecommendationPayload(content: string): ParsedRecommendationPayload {
  const jsonCandidate = extractJsonObject(content);

  if (!jsonCandidate) {
    return {
      reply: content.trim() || "I found a few ideas for you.",
      recommendations: [],
    };
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as {
      reply?: string;
      recommendations?: Array<Partial<ChatRecommendation>>;
    };

    return {
      reply:
        parsed.reply?.trim() || "I found a few movie ideas that fit your vibe.",
      recommendations: (parsed.recommendations ?? [])
        .map(normalizeRecommendation)
        .filter((item): item is ChatRecommendation => item !== null)
        .slice(0, 4),
    };
  } catch {
    return {
      reply: content.trim() || "I found a few movie ideas for you.",
      recommendations: [],
    };
  }
}

export function normalizeMobileLlmUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return trimmedValue.replace(/\/$/, "");
  }
}

export function loadMobileLlmUrl() {
  const storedUrl = window.localStorage.getItem(MOBILE_LLM_STORAGE_KEY);
  return normalizeMobileLlmUrl(storedUrl || MOBILE_LLM_DEFAULT_URL);
}

export function saveMobileLlmUrl(value: string) {
  const normalizedValue = normalizeMobileLlmUrl(value);

  if (!normalizedValue) {
    window.localStorage.removeItem(MOBILE_LLM_STORAGE_KEY);
    return "";
  }

  window.localStorage.setItem(MOBILE_LLM_STORAGE_KEY, normalizedValue);
  return normalizedValue;
}

export async function checkMobileLlmHealth(
  baseUrl: string,
  signal?: AbortSignal
) {
  const response = await fetch(`${baseUrl}/health`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error("Mobile LLM health check failed.");
  }

  return (await response.json()) as {
    status?: string;
    message?: string;
    model?: string;
  };
}

export async function requestMovieRecommendations(
  baseUrl: string,
  messages: MobileLlmConversationMessage[],
  signal?: AbortSignal
) {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mobile-nebula-assistant",
      temperature: 0.7,
      max_tokens: 450,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error("Mobile LLM request failed.");
  }

  const payload = (await response.json()) as MobileLlmResponse;
  const content = joinContent(payload.choices?.[0]?.message?.content);

  return parseRecommendationPayload(content);
}
