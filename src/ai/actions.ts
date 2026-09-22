import { shallowRef } from "vue";

/**
 * Actions the classifier may run, as opposed to pages it may open.
 *
 * A page registers the actions it can perform while it is mounted; the intent router
 * looks one up after navigating. Nothing is registered globally, so an action the
 * current page does not offer simply does not happen — the same containment the URL
 * filters have.
 */

export const NO_ACTION = "none" as const;

export const ACTIONS = {
  [NO_ACTION]: "The user only wants to see something; no action to perform.",
  export_csv: "Export / download the current list as a file. 匯出, 下載, 存成 CSV, 出報表.",
  refresh: "Re-read the data, refresh the page. 刷新, 重新整理, 更新資料.",
  archive_hosts:
    "Archive / retire the machines currently listed or selected. 封存, 下架, 移除主機.",
  create_dispatch:
    "Create a patch dispatch job for outstanding vulnerabilities. 派送修補, 建立派送, 推送更新.",
  save_view:
    "Remember the current filtered view for later. 存成常用視圖, 加到我的最愛, 記住這個畫面.",
} as const;

export type ActionId = keyof typeof ACTIONS;

export const ACTION_LABEL: Record<ActionId, string> = {
  [NO_ACTION]: "無動作",
  export_csv: "匯出 CSV",
  refresh: "刷新",
  archive_hosts: "批次封存",
  create_dispatch: "建立派送",
  save_view: "存成常用視圖",
};

/**
 * Actions that change data. The model is asked separately whether it thinks the message
 * is destructive, but this table is the one that decides: a model answer never turns a
 * destructive action into a safe one.
 */
export const DESTRUCTIVE: Record<ActionId, boolean> = {
  [NO_ACTION]: false,
  export_csv: false,
  refresh: false,
  archive_hosts: true,
  create_dispatch: true,
  save_view: false,
};

export interface ActionHandler {
  /** What the confirmation asks, e.g. "封存 12 台主機？". Also the success line. */
  describe: () => string;
  run: () => void;
}

/** Registered by the page that is currently mounted, keyed by action id. */
const handlers = shallowRef(new Map<ActionId, ActionHandler>());

export function registerActions(entries: Partial<Record<ActionId, ActionHandler>>): () => void {
  const next = new Map(handlers.value);
  for (const [id, handler] of Object.entries(entries)) {
    if (handler) next.set(id as ActionId, handler);
  }
  handlers.value = next;

  return () => {
    const cleaned = new Map(handlers.value);
    for (const id of Object.keys(entries)) cleaned.delete(id as ActionId);
    handlers.value = cleaned;
  };
}

export function lookupAction(id: ActionId): ActionHandler | undefined {
  return handlers.value.get(id);
}
