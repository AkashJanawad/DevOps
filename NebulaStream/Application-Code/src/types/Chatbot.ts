import { Movie } from "src/types/Movie";

export type ChatRole = "user" | "assistant" | "status";

export type ChatRecommendation = {
  title: string;
  reason: string;
  mood?: string;
  yearHint?: string;
  movie?: Movie | null;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  recommendations?: ChatRecommendation[];
};

export type MobileLlmStatus =
  | "not_configured"
  | "checking"
  | "online"
  | "offline";
