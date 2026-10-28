import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

import { SYSTEM_PROMPT } from "../prompts";
import type { StashTool } from "../tools";
import type { ChatTurn } from "../types";

const MODEL = "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

export async function runClaude(tools: StashTool[], history: ChatTurn[], userText: string): Promise<string> {
  client ??= new Anthropic();

  const finalMessage = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: tools.map((t) =>
      betaZodTool({ name: t.name, description: t.description, inputSchema: t.schema, run: t.run }),
    ),
    max_iterations: 12,
    messages: [
      ...history.map((t): Anthropic.Beta.BetaMessageParam => ({ role: t.role, content: t.content })),
      { role: "user", content: userText },
    ],
  });

  if (finalMessage.stop_reason === "refusal") {
    return "I can't help with that one, but I'm happy to keep tracking your spending.";
  }
  return finalMessage.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
