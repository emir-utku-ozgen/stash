import { NextResponse } from "next/server";

import { namespaceFor, profileFacts } from "@/lib/memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    return NextResponse.json({ memories: await profileFacts(namespaceFor(userId)) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Memory unavailable" }, { status: 502 });
  }
}
