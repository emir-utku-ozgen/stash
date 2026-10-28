import "server-only";

// Small in-memory sliding window. On serverless each instance keeps its own window,
// which is enough to stop one visitor from draining the free LLM quota during a demo.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

export function clientKey(request: Request, userId: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${ip}:${userId}`;
}
