/** A time window as URL state (`?since=week`), shared by the log and vulnerability lists. */

export const NO_RANGE = "none" as const;

export const TIME_RANGES = {
  [NO_RANGE]: "No time window mentioned; show everything.",
  today: "Only today / 今天 / 今日 / 這 24 小時.",
  week: "The last seven days / 本週 / 這禮拜 / 最近一週.",
  month: "The last thirty days / 本月 / 這個月 / 最近一個月.",
  quarter: "The last ninety days / 本季 / 這一季 / 最近三個月.",
} as const;

export type TimeRange = keyof typeof TIME_RANGES;

export const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  [NO_RANGE]: "不限時間",
  today: "今天",
  week: "近 7 天",
  month: "近 30 天",
  quarter: "近 90 天",
};

const DAYS: Record<Exclude<TimeRange, "none">, number> = {
  today: 1,
  week: 7,
  month: 30,
  quarter: 90,
};

export function parseTimeRange(query: Record<string, unknown>): TimeRange {
  const value = query.since;
  return typeof value === "string" && value in DAYS ? (value as TimeRange) : NO_RANGE;
}

/** Everything is measured against the demo's fixed "now", like the rest of the fake data. */
const NOW = new Date("2026-09-22T09:00:00+08:00");

export function withinRange(iso: string, range: TimeRange): boolean {
  if (range === NO_RANGE) return true;
  const days = DAYS[range];
  return NOW.getTime() - new Date(iso).getTime() <= days * 86_400_000;
}
