import "server-only";

import { MemWal } from "@mysten-incubation/memwal";

import type { MemoryKind, RecalledMemory } from "./types";

const RELAYER_URL = process.env.MEMWAL_RELAYER_URL ?? "https://relayer.memory.walrus.xyz";

let client: MemWal | null = null;

function memwal(): MemWal {
  if (client) return client;
  const key = process.env.MEMWAL_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!key || !accountId) {
    throw new Error("MEMWAL_KEY and MEMWAL_ACCOUNT_ID must be set in .env.local");
  }
  client = MemWal.create({ key, accountId, serverUrl: RELAYER_URL, namespace: "stash" });
  return client;
}

/** Each user gets an isolated memory space. User ids come from the browser, so keep them tame. */
export function namespaceFor(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "anon";
  return `stash-${safe}`;
}

/**
 * Store one fact on Walrus Memory. Returns as soon as the relayer accepts the job;
 * encryption and the Walrus upload finish in the background.
 */
export async function rememberFact(namespace: string, kind: MemoryKind, text: string) {
  const dated = `[${kind}] ${text} (noted ${new Date().toISOString().slice(0, 10)})`;
  const accepted = await memwal().remember(dated, namespace);
  return accepted.job_id;
}

export async function recallFacts(
  namespace: string,
  query: string,
  limit = 8,
  sort: "relevance" | "recent" = "relevance",
): Promise<RecalledMemory[]> {
  const { results } = await memwal().recall({ query, limit, namespace, sort });
  return results.map((r) => ({ text: r.text, createdAt: r.created_at ?? null }));
}

/** Everything Stash has learned about the user, newest first. Used for the profile panel. */
export async function profileFacts(namespace: string): Promise<RecalledMemory[]> {
  return recallFacts(
    namespace,
    "the user's goals, budgets, spending habits, preferences and insights",
    40,
    "recent",
  );
}
