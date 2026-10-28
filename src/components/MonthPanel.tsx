"use client";

import { useMemo } from "react";

import type { Expense } from "@/lib/types";

import { CATEGORY_SHADES, money } from "./format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  ledger: Expense[];
  homeCurrency: string;
  onLoadSample: () => void;
  onClear: () => void;
}

export function MonthPanel({ ledger, homeCurrency, onLoadSample, onClear }: Props) {
  const { total, categories, weekdays, weekdayMax, monthName } = useMemo(() => {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const byCategory = new Map<string, number>();
    const byWeekday = Array<number>(7).fill(0);
    let sum = 0;
    for (const e of ledger) {
      if (e.homeAmount === null || e.homeCurrency !== homeCurrency) continue;
      // Rent dominates any weekday view, so the rhythm chart only counts day-to-day spending.
      if (e.category !== "rent") {
        const day = (new Date(`${e.date}T12:00:00`).getDay() + 6) % 7;
        byWeekday[day] += e.homeAmount;
      }
      if (!e.date.startsWith(month)) continue;
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.homeAmount);
      sum += e.homeAmount;
    }
    return {
      total: sum,
      categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      weekdays: byWeekday,
      weekdayMax: Math.max(...byWeekday, 1),
      monthName: now.toLocaleDateString("en-GB", { month: "long" }),
    };
  }, [ledger, homeCurrency]);

  const peakDay = weekdays.indexOf(Math.max(...weekdays));

  return (
    <section aria-labelledby="month-heading" className="rounded-3xl bg-sheet p-5 ring-1 ring-rule">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="month-heading" className="text-sm text-ink-soft">
          Spent in {monthName}
        </h2>
        <div className="flex gap-3 text-xs text-ink-soft">
          <button onClick={onLoadSample} className="underline-offset-2 hover:text-ink hover:underline">
            Load a sample month
          </button>
          {ledger.length > 0 && (
            <button onClick={onClear} className="underline-offset-2 hover:text-alert hover:underline">
              Clear
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 font-display text-4xl font-semibold tracking-tight tabular-nums">{money(total, homeCurrency)}</p>

      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Nothing logged this month. Tell Stash about your last coffee.</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label="Spending by category">
            {categories.map(([name, value], i) => (
              <div
                key={name}
                title={`${name}: ${money(value, homeCurrency)}`}
                style={{ width: `${(value / total) * 100}%`, background: CATEGORY_SHADES[Math.min(i, CATEGORY_SHADES.length - 1)] }}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {categories.map(([name, value], i) => (
              <li key={name} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CATEGORY_SHADES[Math.min(i, CATEGORY_SHADES.length - 1)] }}
                />
                <span className="truncate capitalize">{name}</span>
                <span className="ml-auto tabular-nums text-ink-soft">{money(value, homeCurrency)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-rule pt-4">
            <p className="text-sm text-ink-soft">Your week, day to day</p>
            <div className="mt-2 grid h-20 grid-cols-7 items-end gap-1.5">
              {weekdays.map((value, i) => (
                <div key={WEEKDAYS[i]} className="flex h-full flex-col justify-end gap-1">
                  <div
                    className={`rounded-md ${i === peakDay && value > 0 ? "bg-coin" : "bg-rule"}`}
                    style={{ height: `${Math.max((value / weekdayMax) * 100, 4)}%` }}
                    title={`${WEEKDAYS[i]}: ${money(value, homeCurrency)}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-soft">
              {WEEKDAYS.map((d, i) => (
                <span key={d} className={i === peakDay && weekdays[i] > 0 ? "font-semibold text-ink" : undefined}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
