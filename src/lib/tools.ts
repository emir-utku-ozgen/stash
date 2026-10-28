import "server-only";

import { z } from "zod";

import { namespaceFor, recallFacts, rememberFact } from "./memory";
import { convert } from "./rates";
import type { ChatRequest, Expense, MemoryKind, MemoryWrite } from "./types";

/** Provider-neutral tool: the Claude and Gemini adapters both build on this. */
export interface StashTool<S extends z.ZodObject = z.ZodObject> {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>) => Promise<string>;
}

export interface ToolOutcome {
  expenses: Expense[];
  writes: MemoryWrite[];
  recalled: number;
}

const CATEGORIES = [
  "groceries", "eating out", "transport", "rent", "bills", "fun",
  "shopping", "travel", "health", "education", "other",
] as const;

function tool<S extends z.ZodObject>(t: StashTool<S>): StashTool {
  return t as unknown as StashTool;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function budgetSummary(ledger: Expense[], homeCurrency: string) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = ledger.filter((e) => e.date.startsWith(thisMonth));
  const byCategory: Record<string, number> = {};
  let total = 0;
  let unconverted = 0;
  for (const e of monthExpenses) {
    if (e.homeAmount === null) {
      unconverted += 1;
      continue;
    }
    byCategory[e.category] = round2((byCategory[e.category] ?? 0) + e.homeAmount);
    total += e.homeAmount;
  }
  const byWeekday: Record<string, number> = {};
  for (const e of ledger) {
    if (e.homeAmount === null) continue;
    const day = new Date(`${e.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
    byWeekday[day] = round2((byWeekday[day] ?? 0) + e.homeAmount);
  }
  return {
    homeCurrency,
    month: thisMonth,
    totalThisMonth: round2(total),
    byCategoryThisMonth: byCategory,
    allTimeByWeekday: byWeekday,
    expensesThisMonth: monthExpenses.length,
    expensesAllTime: ledger.length,
    skippedWithoutRate: unconverted,
  };
}

export function buildTools(req: ChatRequest, out: ToolOutcome): StashTool[] {
  const namespace = namespaceFor(req.userId);
  const today = new Date().toISOString().slice(0, 10);

  return [
    tool({
      name: "log_expense",
      description: "Record one purchase in the user's ledger. Converts it to the user's home currency.",
      schema: z.object({
        amount: z.number().describe("Amount spent, a positive number"),
        currency: z.string().describe("ISO 4217 code, e.g. EUR, TRY, USD"),
        category: z.enum(CATEGORIES).describe("Best-fitting category"),
        note: z.string().describe("Short description, e.g. 'coffee with friends'"),
        date: z.string().optional().describe(`YYYY-MM-DD. Defaults to today (${today}).`),
      }),
      run: async (input) => {
        if (!(input.amount > 0)) return "Amount must be a positive number.";
        const currency = input.currency.toUpperCase().slice(0, 3);
        const homeAmount = await convert(input.amount, currency, req.homeCurrency);
        const expense: Expense = {
          id: crypto.randomUUID(),
          date: input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : today,
          amount: input.amount,
          currency,
          category: input.category,
          note: input.note,
          homeAmount,
          homeCurrency: req.homeCurrency,
        };
        out.expenses.push(expense);
        return JSON.stringify({ logged: expense });
      },
    }),

    tool({
      name: "recall_memory",
      description: "Search long-term memory for what you know about this user (goals, budgets, habits, preferences, insights).",
      schema: z.object({
        query: z.string().describe("What you want to know, in natural language"),
      }),
      run: async ({ query }) => {
        const facts = await recallFacts(namespace, query, 8);
        out.recalled += facts.length;
        if (facts.length === 0) return "Nothing remembered yet for this query.";
        return facts.map((f) => `- ${f.text}`).join("\n");
      },
    }),

    tool({
      name: "remember",
      description: "Save one durable fact about the user to long-term memory so future conversations get better.",
      schema: z.object({
        kind: z.enum(["goal", "budget", "habit", "preference", "insight", "context"]),
        fact: z.string().describe("One self-contained sentence, written so it makes sense months from now"),
      }),
      run: async ({ kind, fact }) => {
        await rememberFact(namespace, kind as MemoryKind, fact);
        out.writes.push({ kind: kind as MemoryKind, text: fact });
        return "Saved to memory.";
      },
    }),

    tool({
      name: "budget_status",
      description: "Totals for this month by category and all-time totals by weekday, in the home currency.",
      schema: z.object({}),
      run: async () => JSON.stringify(budgetSummary([...req.ledger, ...out.expenses], req.homeCurrency)),
    }),

    tool({
      name: "convert_currency",
      description: "Convert an amount between two currencies using live exchange rates.",
      schema: z.object({
        amount: z.number(),
        from: z.string().describe("ISO 4217 code"),
        to: z.string().describe("ISO 4217 code"),
      }),
      run: async ({ amount, from, to }) => {
        const value = await convert(amount, from, to);
        return value === null
          ? "No exchange rate available right now."
          : `${amount} ${from.toUpperCase()} = ${value} ${to.toUpperCase()}`;
      },
    }),
  ];
}

/** Validate model-supplied arguments before running a tool; errors go back to the model as text. */
export async function runTool(tools: StashTool[], name: string, args: unknown): Promise<string> {
  const t = tools.find((x) => x.name === name);
  if (!t) return `Unknown tool: ${name}`;
  const parsed = t.schema.safeParse(args ?? {});
  if (!parsed.success) return `Invalid arguments for ${name}: ${parsed.error.message}`;
  try {
    return await t.run(parsed.data);
  } catch (err) {
    return `Tool ${name} failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}
