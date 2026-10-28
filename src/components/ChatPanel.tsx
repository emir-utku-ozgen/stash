"use client";

import { useEffect, useRef } from "react";

import type { ChatTurn, Expense, MemoryWrite } from "@/lib/types";

import { money } from "./format";

export interface UiTurn extends ChatTurn {
  memoriesWritten?: MemoryWrite[];
  memoriesRecalled?: number;
  logged?: Expense[];
}

const SUGGESTIONS = [
  "12 euro lunch and 3.20 for the bus",
  "I want to keep my Erasmus budget under 900 euro a month",
  "How am I doing this month?",
  "What's 50 euro in lira?",
];

interface Props {
  turns: UiTurn[];
  busy: boolean;
  error: string;
  input: string;
  ready: boolean;
  onInput: (value: string) => void;
  onSend: (text: string) => void;
}

function Receipt({ turn }: { turn: UiTurn }) {
  const logged = turn.logged ?? [];
  const learned = turn.memoriesWritten ?? [];
  if (!logged.length && !learned.length && !turn.memoriesRecalled) return null;
  return (
    <div className="mt-2 space-y-1.5 text-xs">
      {logged.length > 0 && (
        <ul className="divide-y divide-dashed divide-rule rounded-xl border border-dashed border-rule bg-paper/60 px-3 py-1">
          {logged.map((x) => (
            <li key={x.id} className="flex items-center gap-2 py-1.5">
              <span className="first-letter:uppercase">{x.note || x.category}</span>
              <span className="text-ink-soft">{x.category}</span>
              <span className="ml-auto tabular-nums font-medium">
                {money(x.amount, x.currency, 2)}
                {x.currency !== x.homeCurrency && x.homeAmount !== null && (
                  <span className="font-normal text-ink-soft"> ({money(x.homeAmount, x.homeCurrency, 2)})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {learned.map((m, i) => (
        <p key={i} className="flex gap-2 rounded-xl bg-mind-soft px-3 py-2 text-mind">
          <span aria-hidden>✦</span>
          <span>
            Remembered: <span className="text-ink">{m.text}</span>
          </span>
        </p>
      ))}
      {!!turn.memoriesRecalled && !learned.length && (
        <p className="text-ink-soft">Drew on {turn.memoriesRecalled} things it remembers about you.</p>
      )}
    </div>
  );
}

export function ChatPanel({ turns, busy, error, input, ready, onInput, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    onSend(input);
  }

  return (
    <section aria-label="Conversation" className="flex min-h-[70dvh] flex-col overflow-hidden rounded-3xl bg-sheet ring-1 ring-rule lg:min-h-0">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8">
        {turns.length === 0 && (
          <div className="mx-auto max-w-md py-8">
            <p className="font-display text-3xl font-semibold leading-tight tracking-tight">
              Tell me what you spent. I&apos;ll remember the rest.
            </p>
            <p className="mt-3 text-ink-soft">
              Write the way you&apos;d text a friend, in any currency. Stash logs it, converts it with live rates, and learns your
              goals and habits as you go.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  disabled={!ready || busy}
                  className="rounded-full border border-rule px-3 py-1.5 text-left text-sm hover:border-ink disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[80%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 leading-relaxed text-paper">{t.content}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-coin font-display text-sm font-bold text-ink"
              >
                S
              </span>
              <div className="min-w-0 max-w-[85%]">
                <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
                <Receipt turn={t} />
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex gap-3" role="status" aria-label="Stash is thinking">
            <span aria-hidden className="grid size-8 place-items-center rounded-full bg-coin font-display text-sm font-bold text-ink">
              S
            </span>
            <span className="typing flex items-center gap-1 text-2xl leading-none text-ink-soft">
              <span>·</span>
              <span>·</span>
              <span>·</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="border-t border-rule px-5 py-2 text-sm text-alert">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="flex gap-2 border-t border-rule p-3 sm:p-4">
        <label htmlFor="message" className="sr-only">
          Message Stash
        </label>
        <input
          id="message"
          value={input}
          onChange={(e) => onInput(e.target.value)}
          placeholder="8.50 for coffee and cake…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-2xl bg-paper px-4 py-3 outline-none ring-1 ring-transparent focus:ring-ink"
          disabled={!ready}
        />
        <button
          type="submit"
          disabled={!ready || busy || !input.trim()}
          className="rounded-2xl bg-ink px-5 py-3 font-medium text-paper disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </section>
  );
}
