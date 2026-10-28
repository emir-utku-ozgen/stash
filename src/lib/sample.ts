import type { Expense } from "./types";

// A realistic month for an Erasmus student, so the reflection step has patterns to find:
// eating out and fun spike on Fridays, groceries are steady but land on different days.
// [weeksAgo, weekday (0 = Monday), amount in EUR, category, note]
const TEMPLATE: Array<[number, number, number, string, string]> = [
  [4, 0, 650, "rent", "room rent share"],
  [3, 0, 42.3, "groceries", "Pingo Doce weekly shop"],
  [3, 2, 3.2, "transport", "bus card top-up"],
  [3, 4, 28, "eating out", "Friday dinner with flatmates"],
  [3, 4, 14, "fun", "bar after dinner"],
  [2, 2, 38.9, "groceries", "weekly shop"],
  [2, 1, 9.5, "education", "printing and notebooks"],
  [2, 4, 31.5, "eating out", "Friday tapas night"],
  [2, 4, 18, "fun", "club entry"],
  [2, 6, 22, "transport", "train to Porto"],
  [1, 5, 41.1, "groceries", "weekly shop"],
  [1, 2, 12.4, "eating out", "lunch on campus"],
  [1, 3, 15.99, "bills", "phone plan"],
  [1, 4, 35, "eating out", "Friday pizza and drinks"],
  [1, 4, 20, "fun", "concert ticket"],
  [0, 1, 44.6, "groceries", "weekly shop"],
  [0, 1, 7.8, "eating out", "coffee and pastel de nata"],
];

function dateFor(weeksAgo: number, weekday: number): string {
  const today = new Date();
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const d = new Date(mondayThisWeek);
  d.setDate(mondayThisWeek.getDate() - weeksAgo * 7 + weekday);
  // Never put sample spending in the future.
  return (d > today ? today : d).toISOString().slice(0, 10);
}

/** Sample month in EUR. `rate` converts EUR to the user's home currency. */
export function sampleMonth(homeCurrency: string, rate: number | null): Expense[] {
  return TEMPLATE.map(([weeksAgo, weekday, amount, category, note], i) => ({
    id: `sample-${i}`,
    date: dateFor(weeksAgo, weekday),
    amount,
    currency: "EUR",
    category,
    note,
    homeAmount: rate === null ? null : Math.round(amount * rate * 100) / 100,
    homeCurrency,
  }));
}
