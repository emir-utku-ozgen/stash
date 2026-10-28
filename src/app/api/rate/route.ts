import { NextResponse } from "next/server";

import { getRate } from "@/lib/rates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!/^[A-Za-z]{3,5}$/.test(from) || !/^[A-Za-z]{3,5}$/.test(to)) {
    return NextResponse.json({ error: "from and to must be currency codes" }, { status: 400 });
  }
  return NextResponse.json({ from: from.toUpperCase(), to: to.toUpperCase(), rate: await getRate(from, to) });
}
