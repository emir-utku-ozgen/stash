export type MemoryKind = "goal" | "budget" | "habit" | "preference" | "insight" | "context";

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: string;
  category: string;
  note: string;
  /** Amount converted to the user's home currency, null if no rate was available. */
  homeAmount: number | null;
  homeCurrency: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  userId: string;
  homeCurrency: string;
  ledger: Expense[];
  history: ChatTurn[];
  message: string;
}

export interface MemoryWrite {
  kind: MemoryKind;
  text: string;
}

export interface ChatResponse {
  reply: string;
  newExpenses: Expense[];
  memoriesWritten: MemoryWrite[];
  memoriesRecalled: number;
}

export interface RecalledMemory {
  text: string;
  createdAt: string | null;
}
