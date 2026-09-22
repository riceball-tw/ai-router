import type { SortField } from "@/lib/sort-query";

/** Sort concepts the vulnerability list can express, as its own column keys. */
export const VANS_SORT_KEYS: Partial<Record<SortField, string>> = {
  risk_score: "cvss",
  affected_hosts: "affected",
  published: "publishedAt",
  name: "cveId",
};

export const VANS_SORTABLE = [
  "cveId",
  "software",
  "severity",
  "cvss",
  "affected",
  "patchStatus",
  "publishedAt",
];
