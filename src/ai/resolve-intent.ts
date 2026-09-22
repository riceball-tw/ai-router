import {
  ASSET_FILTER_LABEL,
  FILTER_FLOOR,
  NO_FILTER,
  NO_HOST,
  NO_OS,
  NO_SEVERITY,
  type Destination,
  type IntentAnswers,
} from "@/ai/intents";
import { SEVERITY_LABEL, type Severity } from "@/data/console";
import { NO_SORT, SORT_FIELD_LABEL, toSortQuery, type SortField } from "@/lib/sort-query";
import { NO_RANGE, TIME_RANGE_LABEL } from "@/lib/time-range";
import { ASSET_QUERY, ASSET_SORT_KEYS } from "@/pages/assets/asset-filters";
import { VANS_SORT_KEYS } from "@/pages/vans/vans-filters";
import type { RouteLocationRaw } from "vue-router";

/**
 * Answers → a route, as a pure function: no router, no component. Everything that
 * decides how the classifier's answers land lives here, so cross-page behaviour can be
 * tested and evaluated without a browser (`src/ai/resolve-intent.test.ts`, `vp run eval`).
 */

/** What each page can express as URL state. A page missing a key ignores that answer. */
interface PageCapability {
  route: string;
  /** Accepts the host-list filters (status / compliance / risk / os). */
  hostFilters?: boolean;
  /** Accepts `?severity=`. */
  severity?: boolean;
  /** Sort concepts this page has columns for. */
  sortKeys?: Partial<Record<SortField, string>>;
  /** Accepts `?since=` over its own date column. */
  timeRange?: boolean;
}

const PAGES: Record<Destination, PageCapability | null> = {
  dashboard: { route: "dashboard" },
  assets: { route: "assets", hostFilters: true, sortKeys: ASSET_SORT_KEYS },
  asset_detail: { route: "asset-detail" },
  asset_org: { route: "assets-org" },
  gcb_compliance: { route: "gcb" },
  gcb_policy: { route: "gcb-policy" },
  vans_risk: { route: "vans", severity: true, sortKeys: VANS_SORT_KEYS, timeRange: true },
  vans_patch: { route: "vans-patch" },
  system_users: { route: "system-users" },
  system_logs: { route: "system-logs", timeRange: true },
  system_settings: { route: "system-settings" },
  unknown: null,
};

export interface ResolvedIntent {
  route: RouteLocationRaw;
  /** The state that survived, in the user's words: "離線", "Windows", "風險分數↓". */
  applied: string[];
  /** State this page cannot express, with the page that could. */
  dropped: { labels: string[]; on: Destination } | null;
  /** True when this built on the view the user was already looking at. */
  refining?: boolean;
}

/** The host-scoped answers, above their confidence floor. Page-independent. */
function hostFilters(answers: IntentAnswers): { query: Record<string, string>; labels: string[] } {
  const { assetFilter, assetOs } = answers;
  const query: Record<string, string> = {};
  const labels: string[] = [];

  if (assetFilter.choice !== NO_FILTER && assetFilter.confidence >= FILTER_FLOOR) {
    Object.assign(query, ASSET_QUERY[assetFilter.choice]);
    labels.push(ASSET_FILTER_LABEL[assetFilter.choice]);
  }
  if (assetOs.choice !== NO_OS && assetOs.confidence >= FILTER_FLOOR) {
    query.os = assetOs.choice;
    labels.push(assetOs.choice);
  }
  return { query, labels };
}

/** Where the user already is, so a refinement can build on it instead of resetting it. */
export interface CurrentView {
  routeName: string;
  query: Record<string, string>;
}

/**
 * @param destination overrides the classifier's pick — this is what the "did you mean"
 * buttons pass, so choosing a page re-applies the same filters and ordering onto it.
 * @param current the view being looked at; when the classifier says the message refines
 * it, the answers are merged onto its query rather than replacing it.
 */
export function resolveIntent(
  answers: IntentAnswers,
  destination: Destination = answers.destination.choice,
  current?: CurrentView,
): ResolvedIntent | null {
  const page = PAGES[destination];
  if (!page) return null;

  // A named host wins: that page is one machine, nothing else to filter.
  if (destination === "asset_detail" && answers.host.choice !== NO_HOST) {
    return {
      route: { name: page.route, params: { id: answers.host.choice } },
      applied: [],
      dropped: null,
    };
  }
  if (destination === "asset_detail")
    return { route: { name: "assets" }, applied: [], dropped: null };

  // A refinement of the page we are already on starts from its query, so "再只看 Windows"
  // keeps the filters already there. Anything the new answers set overwrites it below.
  const refining = answers.refinement.noul >= 0.5 && current?.routeName === page.route;
  const query: Record<string, string> = refining ? { ...current.query } : {};
  const applied: string[] = [];
  const filters = hostFilters(answers);

  if (page.hostFilters) {
    Object.assign(query, filters.query);
    applied.push(...filters.labels);
  }

  if (page.timeRange && answers.timeRange.choice !== NO_RANGE) {
    query.since = answers.timeRange.choice;
    applied.push(TIME_RANGE_LABEL[answers.timeRange.choice]);
  }

  if (page.severity && answers.severity.choice !== NO_SEVERITY) {
    query.severity = answers.severity.choice;
    applied.push(SEVERITY_LABEL[answers.severity.choice as Severity]);
  }

  const { sortField, sortDirection } = answers;
  if (page.sortKeys && sortField.choice !== NO_SORT && sortField.confidence >= FILTER_FLOOR) {
    const sort = toSortQuery(page.sortKeys, sortField.choice, sortDirection.choice);
    if (sort.sort) {
      query.sort = sort.sort;
      query.dir = sort.dir ?? "asc";
      applied.push(`${SORT_FIELD_LABEL[sortField.choice]}${sort.dir === "desc" ? "↓" : "↑"}`);
    }
  }

  // Filters the user asked for that this page has no way to show — the host list does.
  const dropped =
    !page.hostFilters && filters.labels.length > 0 && applied.length === 0
      ? { labels: filters.labels, on: "assets" as Destination }
      : null;

  return { route: { name: page.route, query }, applied, dropped, refining };
}
