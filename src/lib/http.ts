import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export function errorResponse(err: unknown) {
  console.error(err);
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "Too many requests, try again in a moment." }, { status: 429 });
  }
  if (err instanceof Anthropic.APIError) {
    return NextResponse.json({ error: "The AI service had a problem. Try again." }, { status: 502 });
  }
  return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
}
