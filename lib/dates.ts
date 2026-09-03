const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** "2026-09-01" -> "September 1, 2026" */
export function formatLongDate(iso: string): string {
  return LONG_DATE.format(new Date(`${iso}T00:00:00Z`));
}

/** "2026-09-01" -> "Week of September 1, 2026" */
export function formatWeekOf(iso: string): string {
  return `Week of ${formatLongDate(iso)}`;
}

/** "2026-09-01" -> "September 1" (year dropped) */
export function formatMonthDay(iso: string): string {
  return MONTH_DAY.format(new Date(`${iso}T00:00:00Z`));
}

const DAY = 86_400_000;
const toISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The Edition ships on a Thursday and covers the previous complete week.
 * Given a publish date (defaults to today), returns the Monday of that
 * covered week as an ISO date — the value for an issue's `weekOf`.
 */
export function coveredWeekMonday(publishOn: Date = new Date()): string {
  const t = Date.parse(`${publishOn.toISOString().slice(0, 10)}T00:00:00Z`);
  const dow = new Date(t).getUTCDay(); // 0 Sun … 6 Sat
  const thisMonday = t - ((dow + 6) % 7) * DAY;
  return toISO(thisMonday - 7 * DAY);
}

const ROMAN: Array<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(value: number): string {
  let remaining = Math.max(0, Math.floor(value));
  let out = "";
  for (const [n, sym] of ROMAN) {
    while (remaining >= n) {
      out += sym;
      remaining -= n;
    }
  }
  return out || "0";
}
