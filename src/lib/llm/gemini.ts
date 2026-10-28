import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { SYSTEM_PROMPT } from "../prompts";
import { runTool, type StashTool } from "../tools";
import type { ChatTurn } from "../types";

// Free tier model (see ai.google.dev/gemini-api/docs/pricing). gemini-3.8-flash is often
// saturated on the free tier (multi-minute waits), so default to the responsive 3.5 Flash.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const MAX_ROUNDS = 8;

let client: GoogleGenAI | null = null;

function declaration(t: StashTool) {
  const schema = z.toJSONSchema(t.schema) as Record<string, unknown>;
  delete schema.$schema;
  delete schema.additionalProperties;
  return { type: "function" as const, name: t.name, description: t.description, parameters: schema };
}

function transcript(history: ChatTurn[]): string {
  if (history.length === 0) return "";
  const lines = history.map((t) => `${t.role === "user" ? "User" : "Stash"}: ${t.content}`);
  return `Earlier in this conversation:\n${lines.join("\n")}\n\n`;
}

export async function runGemini(tools: StashTool[], history: ChatTurn[], userText: string): Promise<string> {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const declarations = tools.map(declaration);
  const base = {
    model: MODEL,
    system_instruction: SYSTEM_PROMPT,
    tools: declarations,
    generation_config: { thinking_level: "low" as const },
  };

  let interaction = await client.interactions.create({
    ...base,
    input: `${transcript(history.slice(-12))}${userText}`,
  });

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const calls = (interaction.steps ?? []).filter((s) => s.type === "function_call");
    if (calls.length === 0) break;

    // Run every call from this turn, then return all results together.
    const results = await Promise.all(
      calls.map(async (call) => ({
        type: "function_result" as const,
        name: call.name,
        call_id: call.id,
        result: [{ type: "text" as const, text: await runTool(tools, call.name, call.arguments) }],
      })),
    );

    interaction = await client.interactions.create({
      ...base,
      previous_interaction_id: interaction.id,
      input: results,
    });
  }

  return (interaction.output_text ?? "").trim();
}
