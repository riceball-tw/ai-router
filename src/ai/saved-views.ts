import { describeAssetQuery, parseAssetQuery } from "@/pages/assets/asset-filters";
import { SEVERITY_LABEL, type Severity } from "@/data/console";
import { SORT_FIELD_LABEL } from "@/lib/sort-query";
import { parseTimeRange, TIME_RANGE_LABEL } from "@/lib/time-range";
import { ref } from "vue";

/**
 * A saved view is just a URL — which is the point of keeping filters, ordering and the
 * time window in the query string. The label is derived from that URL, so a view saved
 * by the chat and one saved from the toolbar read the same.
 */
export interface SavedView {
  label: string;
  path: string;
}

const STORAGE_KEY = "console:saved-views";

function load(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}

export const savedViews = ref<SavedView[]>(load());

const PAGE_LABEL: Record<string, string> = {
  "/dashboard": "儀表板",
  "/assets": "主機列表",
  "/assets/org": "組織資訊",
  "/gcb": "合規檢視",
  "/gcb/policy": "組態設定",
  "/vans": "風險管理",
  "/vans/patch": "修補計畫",
  "/system/users": "使用者管理",
  "/system/logs": "操作紀錄",
  "/system/settings": "系統設定",
};

/** "主機列表・離線・Windows・合規率↑" straight out of the URL. */
export function describeView(fullPath: string): string {
  const [path, search] = fullPath.split("?");
  const query = Object.fromEntries(new URLSearchParams(search ?? ""));
  const parts: string[] = [PAGE_LABEL[path ?? ""] ?? path ?? ""];

  parts.push(...describeAssetQuery(parseAssetQuery(query)).map((chip) => chip.label));

  const severity = query.severity;
  if (severity && severity in SEVERITY_LABEL) parts.push(SEVERITY_LABEL[severity as Severity]);

  const range = parseTimeRange(query);
  if (range !== "none") parts.push(TIME_RANGE_LABEL[range]);

  if (query.sort) {
    const field = Object.entries(SORT_FIELD_LABEL).find(([key]) => query.sort?.includes(key));
    parts.push(`${field?.[1] ?? query.sort}${query.dir === "desc" ? "↓" : "↑"}`);
  }
  return parts.join("・");
}

export function addSavedView(fullPath: string): string {
  const label = describeView(fullPath);
  const next = [
    { label, path: fullPath },
    ...savedViews.value.filter((view) => view.path !== fullPath),
  ].slice(0, 6);
  savedViews.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or blocked storage: the view still works for this session.
  }
  return label;
}

export function removeSavedView(path: string) {
  savedViews.value = savedViews.value.filter((view) => view.path !== path);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedViews.value));
  } catch {
    // Ignored on purpose, as above.
  }
}
