"use client";

import type { RecalledMemory } from "@/lib/types";

import { KINDS, splitKind } from "./format";

export interface PanelMemory extends RecalledMemory {
  /** Written this session but not yet returned by the relayer. */
  pending?: boolean;
}

interface Props {
  memories: PanelMemory[];
  freshTexts: Set<string>;
  state: "idle" | "loading" | "error";
  reflecting: boolean;
  canReflect: boolean;
  onRefresh: () => void;
  onReflect: () => void;
}

function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function MemoryPanel({ memories, freshTexts, state, reflecting, canReflect, onRefresh, onReflect }: Props) {
  return (
    <section aria-labelledby="memory-heading" className="flex min-h-[320px] flex-1 flex-col rounded-3xl bg-sheet p-5 ring-1 ring-rule">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="memory-heading" className="font-display text-lg font-semibold leading-tight tracking-tight text-balance">
            {memories.length === 0
              ? "Stash doesn't know you yet"
              : `What Stash knows about you (${memories.length})`}
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">Encrypted on Walrus Memory. It follows you across sessions and devices.</p>
        </div>
        <button
          onClick={onRefresh}
          className="shrink-0 rounded-full px-2 py-1 text-xs text-ink-soft hover:bg-paper hover:text-ink"
          aria-label="Reload memories from Walrus"
        >
          {state === "loading" ? "Loading…" : "Reload"}
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {state === "error" && (
          <p className="text-sm text-alert">Walrus Memory didn&apos;t answer. Reload in a few seconds.</p>
        )}
        {memories.length === 0 && state !== "error" ? (
          <p className="text-sm text-ink-soft">
            Mention a goal (&ldquo;I want to save 200 euro for a trip&rdquo;) or a habit, and it shows up here.
          </p>
        ) : (
          <ol className="relative space-y-1 border-l border-rule pl-4">
            {memories.map((m) => {
              const { kind, body } = splitKind(m.text);
              const meta = KINDS[kind] ?? KINDS.context;
              const fresh = [...freshTexts].some((t) => body.includes(t) || t.includes(body));
              return (
                <li key={m.text} className={`relative -ml-1 rounded-xl py-2 pr-2 pl-1 ${fresh ? "memory-new" : ""}`}>
                  <span aria-hidden className={`absolute top-3.5 -left-[13px] size-2 rounded-full ring-4 ring-sheet ${meta.dot}`} />
                  <p className="text-sm leading-snug">{body}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {meta.label}
                    {m.pending ? ", saving to Walrus…" : m.createdAt ? `, ${shortDate(m.createdAt)}` : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        onClick={onReflect}
        disabled={!canReflect || reflecting}
        className="mt-4 rounded-2xl bg-mind px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40 dark:text-paper"
      >
        {reflecting ? "Looking for patterns…" : "Look for patterns in my spending"}
      </button>
    </section>
  );
}
