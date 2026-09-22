import type { ActionId } from "@/ai/actions";
import type { SortDirection, SortField } from "@/lib/sort-query";
import type { TimeRange } from "@/lib/time-range";
import type { ChoiceResponse, NoulResponse, ScoreResponse } from "@typesafe-ai/sdk";

/**
 * A criterion the model reads. The docs' recommended shape when options risk confusion:
 * `what` it covers, `not_for` what belongs to a neighbouring option, `examples` in the
 * words operators use. Field names are ours — the API reserves none of them — and the
 * model reads them alongside the values, so they stay short.
 *
 * https://docs.typesafe.ai/primitives/choice.md — "Start with a string. Use an object
 * when a description needs several kinds of guidance."
 */
export type Criterion = {
  what: string;
  not_for?: string;
  examples?: string[];
};

/**
 * The pages the model may pick from. This object is the single source of truth: the
 * server turns it into a TypeSafe `choice()` question, the client turns the picked label
 * into a route. Written in the operator's words, not UI jargon.
 *
 * The pages that kept stealing each other's questions — 主機列表 vs 合規檢視, 操作紀錄 vs
 * 系統設定 — carry `not_for`; the unambiguous ones stay plain strings on purpose.
 */
export const DESTINATIONS = {
  dashboard: {
    what: "The overview: how many machines, overall compliance, how bad things are right now.",
    examples: ["儀表板", "總覽", "現在整體狀況如何"],
  },
  assets: {
    what:
      "A list of MACHINES, including any question answered by filtering the inventory: " +
      "offline ones, ones failing the baseline, ones carrying high-risk CVEs, ones on a given OS.",
    not_for:
      "Compliance summarised per baseline (`gcb_compliance`), or one named machine (`asset_detail`).",
    examples: ["主機列表", "哪些電腦離線", "哪些主機風險高", "有哪些 Windows 主機不合規"],
  },
  asset_detail: {
    what: "One specific machine, named or implied: its compliance, its CVEs, its owner, its last check-in.",
    examples: ["TXG-PC-0001 的組態合規", "這台機器有什麼弱點"],
  },
  asset_org: {
    what: "The organisation tree: units, how many machines each has, which unit is worst.",
    examples: ["組織資訊", "各單位有幾台"],
  },
  gcb_compliance: {
    what: "Compliance rolled up BY BASELINE: the pass rate of each 組態基準 and how many machines it covers.",
    not_for: "Which individual machines fail — that is a list of machines (`assets`).",
    examples: ["合規檢視", "各個組態基準的合規率"],
  },
  gcb_policy: {
    what: "The baseline itself: the policy list, its check items, its version.",
    examples: ["組態設定", "基準有哪些檢測項目"],
  },
  vans_risk: {
    what: "The vulnerability list: CVE entries, their severity, CVSS and affected machine counts.",
    not_for:
      "Which machines are risky, as a machine list (`assets`); patch progress (`vans_patch`).",
    examples: ["弱點", "風險管理", "只看重大風險的弱點", "CVSS 從高到低"],
  },
  vans_patch: {
    what: "Patch work: what is being patched, what is still unpatched, dispatch batches.",
    examples: ["修補計畫", "派送進度", "還有多少沒修補"],
  },
  system_users: {
    what: "Console accounts and roles: who can log in, their permissions, disabling an account.",
    not_for: "What someone did in the past (`system_logs`).",
    examples: ["使用者管理", "有哪些帳號", "誰是管理員"],
  },
  system_logs: {
    what:
      "The audit trail: WHO did something and when. A question about a past action belongs " +
      "here even when it names the thing that was changed.",
    not_for: "Changing the console's configuration now (`system_settings`).",
    examples: ["操作紀錄", "誰改了系統設定", "誰登入失敗", "本週有什麼操作"],
  },
  system_settings: {
    what: "Seeing or changing the console's own configuration now: scan schedule, SMTP, retention, version.",
    not_for: "Who changed it (`system_logs`).",
    examples: ["系統設定", "掃描排程", "寄信設定"],
  },
  unknown: {
    what: "Small talk, nonsense, or a request none of the other labels covers.",
    examples: ["今天天氣如何", "你好"],
  },
} satisfies Record<string, Criterion>;

export type Destination = keyof typeof DESTINATIONS;

/** Model thinks confidence below this is a guess; the UI asks instead of navigating. */
export const CONFIDENCE_FLOOR = 0.55;

/**
 * Risk-scaled gating, as the docs describe it: "different actions within the same system
 * should be gated at different levels depending on the consequences of getting it wrong."
 * Opening a page is undone by the back button; running an action is not.
 *
 * Confidence answers *which* action was meant, never *whether* to run it — a concentrated
 * distribution is not permission. `perform` below is the question that grants it.
 */
export const ACTION_FLOOR = 0.7;

/** Urgency rubric, 0–4. The index is the score; the text is what the model matches on. */
export const URGENCY_RUBRIC = [
  "Looking something up out of routine: opening a page, listing machines, checking a setting.",
  "Checking on something that is probably fine: a single machine's status, this week's activity.",
  "A finding that needs attention: machines below the baseline, an unpatched vulnerability, a failed login.",
  "Machines are exposed right now: a critical CVE affecting many of them, patching long overdue.",
  "An incident in progress: a breach, a spreading compromise, nothing patched anywhere.",
] as const;

export const NO_HOST = "none" as const;
export const NO_SEVERITY = "none" as const;
export const NO_FILTER = "none" as const;
export const NO_OS = "none" as const;

/**
 * A filter below this is treated as "not really asked for": the page still opens,
 * just unfiltered. Lower than the destination floor — being wrong about a filter
 * only costs a click, being wrong about the page costs the whole screen.
 */
export const FILTER_FLOOR = 0.5;

/**
 * The host-list filters, which are URL state (`/assets?status=offline`). Every one of
 * them is also a button on the page, so the model picks between things the user could
 * have clicked. `not_for` on `high_risk` is what stops "CVSS" on the vulnerability list
 * from being read as a machine filter.
 */
export const ASSET_FILTERS = {
  [NO_FILTER]: {
    what: "No subset of machines is being asked for.",
    examples: [
      "列出所有主機",
      "到風險管理 CVSS 從高到低排序",
      "本週的操作紀錄",
      "各個組態基準的合規率",
    ],
    not_for: "Anything that does narrow a list of machines.",
  },
  offline: {
    what: "Only machines that are not checking in.",
    examples: ["哪些主機離線", "很久沒上線的", "失聯的電腦"],
  },
  online: {
    what: "Only machines currently reporting in.",
    examples: ["上線中的主機", "還活著的電腦"],
  },
  low_compliance: {
    what: "Only machines failing the configuration baseline.",
    examples: ["合規率低的主機", "哪些電腦不合規", "未達標的機器"],
  },
  high_risk: {
    what: "Only machines that carry serious vulnerabilities.",
    examples: ["哪些主機風險高", "有重大漏洞的電腦"],
    not_for:
      "A question about the vulnerabilities themselves rather than the machines carrying them, " +
      "and a message that only mentions CVSS to say how to sort.",
  },
} satisfies Record<string, Criterion>;

export type AssetFilter = keyof typeof ASSET_FILTERS;

export const ASSET_FILTER_LABEL: Record<AssetFilter, string> = {
  [NO_FILTER]: "全部",
  offline: "離線",
  online: "上線中",
  low_compliance: "合規率 < 70%",
  high_risk: "CVSS ≥ 7",
};

/** OS is orthogonal to the filter above, so it is its own question. */
export const ASSET_OS = {
  [NO_OS]: "No operating system named, or the message is not about a list of machines.",
  Windows: "Windows desktops or servers.",
  Linux: "Linux hosts, RHEL, servers.",
  macOS: "Macs, macOS, Apple laptops.",
} as const;

export type AssetOs = keyof typeof ASSET_OS;

export interface IntentAnswers {
  destination: ChoiceResponse<Record<Destination, Criterion>>;
  /** Which managed host the message is about, or `none`. */
  host: ChoiceResponse<Record<string, string>>;
  /** Severity filter to apply on the vulnerability list, or `none`. */
  severity: ChoiceResponse<Record<string, string>>;
  /** Which subset of the host list to show, or `none`. */
  assetFilter: ChoiceResponse<Record<AssetFilter, Criterion>>;
  /** Which OS to narrow the host list to, or `none`. */
  assetOs: ChoiceResponse<Record<AssetOs, string>>;
  /** Which column concept to order the table by, or `none`. */
  sortField: ChoiceResponse<Record<SortField, string>>;
  /** Which way to order it, or `none` for the field's natural direction. */
  sortDirection: ChoiceResponse<Record<SortDirection, string>>;
  /** Which time window to show, or `none`. */
  timeRange: ChoiceResponse<Record<TimeRange, string>>;
  /** Which action to perform after arriving, or `none` for "just show me". */
  action: ChoiceResponse<Record<ActionId, string>>;
  /** The model's read on whether the message asks to change data. Advisory only. */
  destructive: NoulResponse;
  /** Is the user telling the console to do it now, as opposed to asking about it? */
  perform: NoulResponse;
  /** Is this narrowing the view the user is already on, rather than a new request? */
  refinement: NoulResponse;
  /** 0–4 rubric: how loudly the answer deserves to be presented. */
  urgency: ScoreResponse;
  navigational: NoulResponse;
}

export interface IntentResponse {
  answers: IntentAnswers;
  model: string;
  /** true when no TYPESAFE_API_KEY was set and the keyword stub answered instead. */
  mocked: boolean;
  usage?: { input_tokens: number; output_tokens: number };
}

/** Human-readable page names for the chat panel's suggestion buttons. */
export const DESTINATION_LABEL: Record<Destination, string> = {
  dashboard: "儀表板",
  assets: "主機列表",
  asset_detail: "主機詳情",
  asset_org: "組織資訊",
  gcb_compliance: "合規檢視",
  gcb_policy: "組態設定",
  vans_risk: "風險管理",
  vans_patch: "修補計畫",
  system_users: "使用者管理",
  system_logs: "操作紀錄",
  system_settings: "系統設定",
  unknown: "無對應頁面",
};

/** Probabilities sorted high to low, for the little bar chart in the chat panel. */
export function ranked(probabilities: Record<string, number>): [string, number][] {
  return Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
}
