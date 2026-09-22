import { ref } from "vue";

/**
 * The little bit of state the demo lets the user change: archived machines and patch
 * dispatches. In the real console these are API calls; here they stay in memory, which is
 * enough to show that a classified action actually did something.
 */

export const archivedHosts = ref(new Set<string>());

export function archiveHosts(objectIds: string[]) {
  const next = new Set(archivedHosts.value);
  for (const id of objectIds) next.add(id);
  archivedHosts.value = next;
}

export interface Dispatch {
  id: string;
  createdAt: string;
  cveIds: string[];
  hostCount: number;
}

export const dispatches = ref<Dispatch[]>([]);

export function createDispatch(cveIds: string[], hostCount: number) {
  dispatches.value = [
    {
      id: `DSP-${String(dispatches.value.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      cveIds,
      hostCount,
    },
    ...dispatches.value,
  ];
}

/** Rows → CSV → a download, entirely client-side. */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
