"use client";

import { useCallback, useEffect, useState } from "react";

import { ChatPanel, type UiTurn } from "@/components/ChatPanel";
import { MemoryPanel, type PanelMemory } from "@/components/MemoryPanel";
import { MonthPanel } from "@/components/MonthPanel";
import { sampleMonth } from "@/lib/sample";
import type { ChatResponse, ChatTurn, Expense, MemoryWrite, RecalledMemory } from "@/lib/types";

const CURRENCIES = ["EUR", "TRY", "USD", "GBP", "PLN"];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the app still works for this session.
  }
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [homeCurrency, setHomeCurrency] = useState("EUR");
  const [ledger, setLedger] = useState<Expense[]>([]);
  const [turns, setTurns] = useState<UiTurn[]>([]);
  const [memories, setMemories] = useState<RecalledMemory[]>([]);
  const [pending, setPending] = useState<MemoryWrite[]>([]);
  const [freshTexts, setFreshTexts] = useState<Set<string>>(new Set());
  const [memoryState, setMemoryState] = useState<"idle" | "loading" | "error">("idle");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<"" | "chat" | "reflect">("");
  const [error, setError] = useState("");

  useEffect(() => {
    let id = load<string>("stash.userId", "");
    if (!id) {
      id = crypto.randomUUID().slice(0, 12);
      save("stash.userId", id);
    }
    setUserId(id);
    setHomeCurrency(load("stash.homeCurrency", "EUR"));
    setLedger(load<Expense[]>("stash.ledger", []));
    setTurns(load<UiTurn[]>("stash.turns", []));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    save("stash.ledger", ledger);
    save("stash.turns", turns.slice(-40));
    save("stash.homeCurrency", homeCurrency);
  }, [ready, ledger, turns, homeCurrency]);

  const refreshMemories = useCallback(async () => {
    if (!userId) return;
    setMemoryState("loading");
    try {
      const res = await fetch(`/api/memories?userId=${encodeURIComponent(userId)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setMemories(body.memories);
      setMemoryState("idle");
    } catch {
      setMemoryState("error");
    }
  }, [userId]);

  useEffect(() => {
    if (ready) void refreshMemories();
  }, [ready, refreshMemories]);

  async function post(path: string, payload: object): Promise<ChatResponse> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Stash couldn't answer. Try again.");
    return body as ChatResponse;
  }

  function applyResponse(data: ChatResponse) {
    if (data.newExpenses.length) setLedger((prev) => [...prev, ...data.newExpenses]);
    setTurns((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.reply,
        memoriesWritten: data.memoriesWritten,
        memoriesRecalled: data.memoriesRecalled,
        logged: data.newExpenses,
      },
    ]);
    if (data.memoriesWritten.length) {
      setFreshTexts(new Set(data.memoriesWritten.map((m) => m.text)));
      setPending((prev) => [...data.memoriesWritten, ...prev]);
      // Walrus writes finish in the background (encrypt, upload, index), so re-read a few times.
      for (const delay of [8000, 20000, 40000]) setTimeout(() => void refreshMemories(), delay);
    }
  }

  // Show what Stash just learned right away; drop each placeholder once Walrus returns it.
  const panelMemories: PanelMemory[] = [
    ...pending
      .filter((p) => !memories.some((m) => m.text.includes(p.text)))
      .map((p) => ({ text: `[${p.kind}] ${p.text}`, createdAt: null, pending: true })),
    ...memories,
  ];

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy || !ready) return;
    setInput("");
    setError("");
    const history: ChatTurn[] = turns.map(({ role, content }) => ({ role, content }));
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setBusy("chat");
    try {
      applyResponse(await post("/api/chat", { userId, homeCurrency, ledger, history, message }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stash couldn't answer. Try again.");
    } finally {
      setBusy("");
    }
  }

  async function reflect() {
    if (busy) return;
    setError("");
    setBusy("reflect");
    try {
      applyResponse(await post("/api/reflect", { userId, homeCurrency, ledger }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stash couldn't finish looking for patterns. Try again.");
    } finally {
      setBusy("");
    }
  }

  async function loadSample() {
    let rate: number | null = 1;
    if (homeCurrency !== "EUR") {
      const res = await fetch(`/api/rate?from=EUR&to=${homeCurrency}`);
      rate = res.ok ? (await res.json()).rate : null;
    }
    setLedger((prev) => [...prev.filter((x) => !x.id.startsWith("sample-")), ...sampleMonth(homeCurrency, rate)]);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-5 sm:px-6 lg:h-dvh lg:py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-10 place-items-center rounded-2xl bg-coin font-display text-xl font-bold text-ink">
            S
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold leading-none tracking-tight">Stash</h1>
            <p className="mt-1 text-sm text-ink-soft">The spending coach that remembers you</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          I count in
          <select
            value={homeCurrency}
            onChange={(e) => setHomeCurrency(e.target.value)}
            className="rounded-xl bg-sheet px-3 py-1.5 font-medium text-ink ring-1 ring-rule"
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </header>

      <main className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ChatPanel
          turns={turns}
          busy={busy !== ""}
          error={error}
          input={input}
          ready={ready}
          onInput={setInput}
          onSend={(t) => void send(t)}
        />
        <aside className="flex min-h-0 flex-col gap-5 lg:overflow-y-auto">
          <MonthPanel
            ledger={ledger}
            homeCurrency={homeCurrency}
            onLoadSample={() => void loadSample()}
            onClear={() => {
              setLedger([]);
              setTurns([]);
            }}
          />
          <MemoryPanel
            memories={panelMemories}
            freshTexts={freshTexts}
            state={memoryState}
            reflecting={busy === "reflect"}
            canReflect={ledger.length > 0 && busy === ""}
            onRefresh={() => void refreshMemories()}
            onReflect={() => void reflect()}
          />
        </aside>
      </main>

      <footer className="mt-4 text-center text-xs text-ink-soft">
        Memory on Walrus Mainnet, live exchange rates from Tatum. Your ledger stays in this browser.
      </footer>
    </div>
  );
}
