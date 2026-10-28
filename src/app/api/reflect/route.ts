import { NextResponse } from "next/server";

import { reflect } from "@/lib/agent";
import { errorResponse } from "@/lib/http";
import { clientKey, rateLimited } from "@/lib/rateLimit";
import type { ChatRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as Pick<ChatRequest, "userId" | "homeCurrency" | "ledger">;
  if (!body?.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (rateLimited(`reflect:${clientKey(request, body.userId)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Stash just looked for patterns. Try again in a few minutes." }, { status: 429 });
  }
  try {
    return NextResponse.json(await reflect({ ...body, ledger: (body.ledger ?? []).slice(-300) }));
  } catch (err) {
    return errorResponse(err);
  }
}
