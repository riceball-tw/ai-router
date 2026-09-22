/**
 * Table sorting as URL state, shared by every list page.
 *
 * The classifier picks a *concept* ("risk score", "compliance rate"), never a column
 * name — the same question has to work on pages whose columns are called different
 * things. Each page maps the concepts it supports onto its own column keys, and the
 * result lands in `?sort=<columnKey>&dir=asc|desc`, exactly what a header click writes.
 */

export const NO_SORT = "none" as const;

export const SORT_FIELDS = {
  [NO_SORT]:
    "No ordering asked for. Use this unless the message actually asks for one — " +
    "排序, 由高到低, 最⋯⋯的排前面, 依⋯⋯排. Naming a risk level or a filter is not an ordering.",
  risk_score: "By vulnerability risk: CVSS score, 風險分數, 嚴重程度, 最危險的排前面.",
  compliance_rate: "By configuration-baseline compliance rate, 合規率, 達標程度.",
  last_seen:
    "By how long it has been out of contact: 離線多久, 多久沒回報, 最後上線時間. " +
    "`desc` here means the longest-missing first.",
  affected_hosts: "By how many hosts something affects, 受影響主機數, 影響範圍.",
  published: "By publication or update date, 公告日期, 發布時間, 最新的.",
  name: "By name or id in alphabetical order, 名稱, 編號.",
} as const;

export type SortField = keyof typeof SORT_FIELDS;

export const SORT_FIELD_LABEL: Record<SortField, string> = {
  [NO_SORT]: "不指定",
  risk_score: "風險分數",
  compliance_rate: "合規率",
  last_seen: "離線時間",
  affected_hosts: "受影響主機數",
  published: "公告日期",
  name: "名稱",
};

export const NO_DIRECTION = "none" as const;

export const SORT_DIRECTIONS = {
  [NO_DIRECTION]: "No direction stated; the field's natural order is fine.",
  desc: "Largest, worst, newest or most recent first. 從高到低, 由大到小, 最新的在前, 最嚴重的在前.",
  asc: "Smallest, best, oldest first. 從低到高, 由小到大, 最舊的在前.",
} as const;

export type SortDirection = keyof typeof SORT_DIRECTIONS;

/**
 * Fields whose concept runs opposite to the column: `last_seen` is asked about as a
 * duration ("離線最久的排前面" = desc) but stored as a timestamp, where that is ascending.
 */
const INVERTED: Partial<Record<SortField, boolean>> = { last_seen: true };

/** Which way a field reads when nobody said: worst/longest/newest first. */
const NATURAL_DESC: Record<SortField, boolean> = {
  [NO_SORT]: false,
  risk_score: true,
  compliance_rate: false,
  last_seen: true,
  affected_hosts: true,
  published: true,
  name: false,
};

export function naturalDesc(field: SortField): boolean {
  return NATURAL_DESC[field];
}

export type SortQuery = {
  sort?: string;
  dir?: "asc" | "desc";
};

export interface SortState {
  sort: string | null;
  desc: boolean;
}

/** Reads `?sort=&dir=` back, ignoring column keys this page does not have. */
export function parseSortQuery(query: Record<string, unknown>, allowed: string[]): SortState {
  const sort = typeof query.sort === "string" && allowed.includes(query.sort) ? query.sort : null;
  return { sort, desc: sort !== null && query.dir === "desc" };
}

/** Turns a classified field + direction into this page's query params, if it supports the field. */
export function toSortQuery(
  columnKeys: Partial<Record<SortField, string>>,
  field: SortField,
  direction: SortDirection,
): SortQuery {
  const sort = columnKeys[field];
  if (!sort) return {};
  const wanted = direction === NO_DIRECTION ? naturalDesc(field) : direction === "desc";
  const desc = INVERTED[field] ? !wanted : wanted;
  return { sort, dir: desc ? "desc" : "asc" };
}
