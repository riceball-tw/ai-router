import type { AssetFilter } from "@/ai/intents";
import type { Host } from "@/data/console";
import type { SortField } from "@/lib/sort-query";

/**
 * The host list's whole filter state, held in the URL.
 *
 * One definition serves both callers: the toolbar buttons write these params on click,
 * and the intent router writes the same ones after the classifier picks a label. The page
 * itself only ever reads `route.query`, so it cannot tell — or care — which one moved it.
 */
// A type alias, not an interface: TS only gives aliases the implicit index signature
// vue-router's LocationQueryRaw needs.
export type AssetQuery = {
  status?: "online" | "offline";
  /** `low` = below the 70% baseline threshold. */
  compliance?: "low";
  /** `high` = CVSS 7.0 or above. */
  risk?: "high";
  os?: "Windows" | "Linux" | "macOS";
};

/** Each classifier label, as the query params it stands for. */
export const ASSET_QUERY: Record<Exclude<AssetFilter, "none">, AssetQuery> = {
  offline: { status: "offline" },
  online: { status: "online" },
  low_compliance: { compliance: "low" },
  high_risk: { risk: "high" },
};

export const LOW_COMPLIANCE_BELOW = 70;
export const HIGH_RISK_CVSS = 7;

/** Reads the filter state back out of a route query, ignoring anything unrecognised. */
export function parseAssetQuery(query: Record<string, unknown>): AssetQuery {
  const parsed: AssetQuery = {};
  if (query.status === "online" || query.status === "offline") parsed.status = query.status;
  if (query.compliance === "low") parsed.compliance = "low";
  if (query.risk === "high") parsed.risk = "high";
  if (query.os === "Windows" || query.os === "Linux" || query.os === "macOS") parsed.os = query.os;
  return parsed;
}

export function applyAssetQuery(hosts: Host[], filters: AssetQuery): Host[] {
  return hosts.filter((host) => {
    if (filters.status && host.status !== filters.status) return false;
    if (filters.compliance === "low" && host.gcbComplianceRate >= LOW_COMPLIANCE_BELOW)
      return false;
    if (filters.risk === "high" && host.cvssScore < HIGH_RISK_CVSS) return false;
    if (filters.os && host.osName !== filters.os) return false;
    return true;
  });
}

/** Chips shown above the table, one per active param, each removable. */
export function describeAssetQuery(
  filters: AssetQuery,
): { key: keyof AssetQuery; label: string }[] {
  const chips: { key: keyof AssetQuery; label: string }[] = [];
  if (filters.status)
    chips.push({ key: "status", label: filters.status === "offline" ? "離線" : "上線中" });
  if (filters.compliance)
    chips.push({ key: "compliance", label: `合規率 < ${LOW_COMPLIANCE_BELOW}%` });
  if (filters.risk) chips.push({ key: "risk", label: `CVSS ≥ ${HIGH_RISK_CVSS}` });
  if (filters.os) chips.push({ key: "os", label: filters.os });
  return chips;
}

/** Sort concepts this page can express, as its own column keys. */
export const ASSET_SORT_KEYS: Partial<Record<SortField, string>> = {
  risk_score: "cvssScore",
  compliance_rate: "gcbComplianceRate",
  last_seen: "lastSeen",
  name: "hostName",
};

export const ASSET_SORTABLE = [
  "hostName",
  "orgName",
  "osName",
  "agentVer",
  "gcbComplianceRate",
  "cvssScore",
  "status",
  "lastSeen",
];
