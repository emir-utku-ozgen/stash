import "server-only";

const TATUM_RATE_URL = "https://api.tatum.io/v4/data/rate/symbol";
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { rate: number; at: number }>();

/** How many `to` units one `from` unit buys, via Tatum's exchange rate API. Null if unavailable. */
export async function getRate(from: string, to: string): Promise<number | null> {
  const src = from.toUpperCase();
  const dst = to.toUpperCase();
  if (src === dst) return 1;

  const cacheKey = `${src}->${dst}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rate;

  const apiKey = process.env.TATUM_API_KEY;
  if (!apiKey) return null;

  const url = `${TATUM_RATE_URL}?symbol=${encodeURIComponent(src)}&basePair=${encodeURIComponent(dst)}`;
  try {
    const res = await fetch(url, { headers: { "x-api-key": apiKey }, cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { value?: string };
    const rate = Number(body.value);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    cache.set(cacheKey, { rate, at: Date.now() });
    return rate;
  } catch {
    return null;
  }
}

export async function convert(amount: number, from: string, to: string): Promise<number | null> {
  const rate = await getRate(from, to);
  return rate === null ? null : Math.round(amount * rate * 100) / 100;
}
