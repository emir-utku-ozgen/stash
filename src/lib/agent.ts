import "server-only";

import { runClaude } from "./llm/claude";
import { runGemini } from "./llm/gemini";
import { REFLECT_PROMPT } from "./prompts";
import { buildTools, type ToolOutcome } from "./tools";
import type { ChatRequest, ChatResponse, ChatTurn } from "./types";

/** Gemini's free tier when its key is set, otherwise Claude. */
function provider() {
  if (process.env.GEMINI_API_KEY) return runGemini;
  if (process.env.ANTHROPIC_API_KEY) return runClaude;
  throw new Error("Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY in .env.local");
}

async function runAgent(req: ChatRequest, history: ChatTurn[], text: string): Promise<ChatResponse> {
  const out: ToolOutcome = { expenses: [], writes: [], recalled: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const userText = `Today is ${today}. Home currency: ${req.homeCurrency}.\n\n${text}`;

  const reply = await provider()(buildTools(req, out), history, userText);

  return {
    reply: reply || "Done.",
    newExpenses: out.expenses,
    memoriesWritten: out.writes,
    memoriesRecalled: out.recalled,
  };
}

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  return runAgent(req, req.history.slice(-16), req.message);
}

export async function reflect(req: Omit<ChatRequest, "message" | "history">): Promise<ChatResponse> {
  const recent = req.ledger
    .slice(-60)
    .map((e) => `${e.date} ${e.category}: ${e.homeAmount ?? "?"} ${e.homeCurrency} (${e.note})`);
  const prompt = `${REFLECT_PROMPT}\n\nLedger (most recent ${recent.length} entries):\n${recent.join("\n") || "(empty)"}`;
  return runAgent({ ...req, message: prompt, history: [] }, [], prompt);
}
