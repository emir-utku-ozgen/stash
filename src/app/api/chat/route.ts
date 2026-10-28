import { NextResponse } from "next/server";

import { chat } from "@/lib/agent";
import { errorResponse } from "@/lib/http";
import { clientKey, rateLimited } from "@/lib/rateLimit";
import type { ChatRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  if (!body?.userId || !body?.message?.trim()) {
    return NextResponse.json({ error: "userId and message are required" }, { status: 400 });
  }
  if (body.message.length > 2000) {
    return NextResponse.json({ error: "That message is too long. Keep it under 2000 characters." }, { status: 400 });
  }
  if (rateLimited(`chat:${clientKey(request, body.userId)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "You've sent a lot of messages. Wait a few minutes and try again." }, { status: 429 });
  }
  try {
    return NextResponse.json(
      await chat({ ...body, ledger: (body.ledger ?? []).slice(-300), history: body.history ?? [] }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
