export function money(value: number, currency: string, digits = 0) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export const KINDS: Record<string, { label: string; dot: string }> = {
  goal: { label: "Goal", dot: "bg-coin" },
  budget: { label: "Budget", dot: "bg-coin" },
  habit: { label: "Habit", dot: "bg-ink" },
  preference: { label: "Preference", dot: "bg-ink-soft" },
  insight: { label: "Insight", dot: "bg-mind" },
  context: { label: "About you", dot: "bg-rule" },
};

export function splitKind(text: string): { kind: string; body: string } {
  const match = /^\[(\w+)\]\s*([\s\S]*)$/.exec(text);
  const raw = match ? match[2] : text;
  // Drop the "(noted YYYY-MM-DD)" suffix the server appends; the date is shown separately.
  const body = raw.replace(/\s*\(noted \d{4}-\d{2}-\d{2}\)\s*$/, "");
  return { kind: match ? match[1] : "context", body };
}

/** Category colours for the month bar: one hue family, stepped lightness, so it stays calm. */
export const CATEGORY_SHADES = [
  "var(--ink)",
  "color-mix(in oklab, var(--ink) 75%, var(--paper))",
  "color-mix(in oklab, var(--ink) 55%, var(--paper))",
  "color-mix(in oklab, var(--ink) 38%, var(--paper))",
  "color-mix(in oklab, var(--ink) 24%, var(--paper))",
  "color-mix(in oklab, var(--ink) 14%, var(--paper))",
];
