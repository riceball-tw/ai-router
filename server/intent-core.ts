import { choice, noul, score, TypeSafeClient, type ChoiceCriteria } from "@typesafe-ai/sdk";
import { ACTIONS, type ActionId } from "../src/ai/actions";
import { TIME_RANGES, type TimeRange } from "../src/lib/time-range";
import {
  URGENCY_RUBRIC,
  ASSET_FILTERS,
  ASSET_OS,
  DESTINATIONS,
  NO_FILTER,
  NO_HOST,
  NO_OS,
  NO_SEVERITY,
  type AssetFilter,
  type AssetOs,
  type Destination,
} from "../src/ai/intents";
import { SEVERITY_LABEL, hosts, type Severity } from "../src/data/console";
import {
  NO_DIRECTION,
  NO_SORT,
  SORT_DIRECTIONS,
  SORT_FIELDS,
  type SortDirection,
  type SortField,
} from "../src/lib/sort-query";

/**
 * A choice question needs a bounded label set, so the classifier is only told about
 * the hosts an operator is likely to name out loud. A real console would resolve the
 * rest through search; enumerating 64 endpoints as labels is not what `choice` is for.
 */
const KNOWN_HOSTS = hosts.slice(0, 12);

function hostCriteria(): ChoiceCriteria {
  const criteria: ChoiceCriteria = {
    [NO_HOST]: "The message is not about one particular machine.",
  };
  for (const host of KNOWN_HOSTS) {
    criteria[host.objectId] =
      `${host.hostName}, ${host.orgName}, ${host.osName} ${host.osVer}, ` +
      `保管人 ${host.owner}, IP ${host.ipAddress.join("/")}, ` +
      `合規率 ${host.gcbComplianceRate}%, ${host.status === "online" ? "上線中" : "離線"}.`;
  }
  return criteria;
}

function severityCriteria(): ChoiceCriteria {
  return {
    [NO_SEVERITY]: "No particular risk level is being asked about.",
    critical: "Only the most severe / 重大 / critical / CVSS 9+ vulnerabilities.",
    high: "High risk / 高風險 vulnerabilities.",
    medium: "Medium risk / 中風險 vulnerabilities.",
    low: "Low risk / 低風險 vulnerabilities.",
  };
}

function questionsFor() {
  return {
    destination: choice(
      "Which page of this security-audit console does the user want to be on?",
      DESTINATIONS,
    ),
    host: choice("Which managed host is the user talking about?", hostCriteria()),
    assetFilter: choice(
      "Which subset of the host inventory is the user asking for?",
      ASSET_FILTERS,
    ),
    assetOs: choice("Which operating system is the user narrowing to?", ASSET_OS),
    sortField: choice("Which column does the user want the table ordered by?", SORT_FIELDS),
    sortDirection: choice("Which way should that ordering run?", SORT_DIRECTIONS),
    timeRange: choice("Which time window is the user asking about?", TIME_RANGES),
    action: choice("Which action does the user want performed, if any?", ACTIONS),
    destructive: noul(
      "Would carrying out this request change or remove data, rather than only display it?",
    ),
    perform: noul("Is the user instructing the console to carry the action out now?", {
      true: "An instruction: 把這些匯出, 封存這些主機, 建立派送, 存成常用視圖.",
      false:
        "Not an instruction to act now: asking whether something is possible, asking where " +
        "a button is, or simply asking to see a page.",
    }),
    refinement: noul(
      "Is the user narrowing or re-ordering the view they are already on (see current_page), " +
        "rather than asking for a different one?",
    ),
    urgency: score("How urgent is what the user is describing?", URGENCY_RUBRIC),
    severity: choice(
      "Which vulnerability risk level is the user asking about?",
      severityCriteria(),
    ),
    navigational: noul(
      "Does the user want the console to show them something or take them somewhere?",
      {
        true:
          "Any request for information this console holds, however phrased — a bare noun " +
          "phrase counts: 本週的操作紀錄, 重大弱點, 離線主機. So does an instruction to act.",
        false:
          "Small talk, a question about the assistant itself, or a remark with nothing to " +
          "show: 今天天氣如何, 你好, 謝謝.",
      },
    ),
  };
}

let client: TypeSafeClient | undefined;
let clientKey: string | undefined;

/** Cached per key so the Worker and the dev server can each pass their own. */
function getClient(apiKey: string | undefined): TypeSafeClient | undefined {
  if (!apiKey) return undefined;
  if (!client || clientKey !== apiKey) {
    client = new TypeSafeClient({ apiKey, timeout: 15_000 });
    clientKey = apiKey;
  }
  return client;
}

/**
 * Keyword stub used when TYPESAFE_API_KEY is missing, so the demo still runs.
 * Same response shape as the model, deliberately dumber — the low confidence it
 * returns on anything ambiguous is what the confidence gate in the UI reacts to.
 */
function mockAnswers(message: string, currentPath: string) {
  const text = message.toLowerCase();
  const matchedHost = KNOWN_HOSTS.find(
    (host) =>
      text.includes(host.hostName.toLowerCase()) ||
      text.includes(host.objectId.toLowerCase()) ||
      host.ipAddress.some((ip) => text.includes(ip)) ||
      text.includes(host.owner),
  );

  const hits: Record<Destination, number> = {
    dashboard: /儀表板|總覽|overview|dashboard|狀況/.test(text) ? 3 : 0.2,
    assets: /主機|資產|列表|端點|離線|host|asset|inventory|offline/.test(text) ? 3 : 0.2,
    asset_detail: (/這台|詳細|detail|某台/.test(text) ? 2 : 0.2) + (matchedHost ? 3 : 0),
    asset_org: /組織|單位|部門|org|unit/.test(text) ? 3 : 0.2,
    gcb_compliance: /合規|組態合規|gcb|baseline|compliance|達標/.test(text) ? 3 : 0.2,
    gcb_policy: /基準|政策|policy|組態設定|檢測項目/.test(text) ? 2.5 : 0.2,
    vans_risk: /弱點|漏洞|風險|cve|cvss|vulnerab/.test(text) ? 3 : 0.2,
    vans_patch: /修補|派送|patch|更新程式|補丁/.test(text) ? 3 : 0.2,
    system_users: /帳號|使用者|權限|角色|user|role|account/.test(text) ? 3 : 0.2,
    system_logs: /紀錄|日誌|稽核軌跡|log|audit/.test(text) ? 3 : 0.2,
    system_settings: /設定|排程|smtp|寄信|保存|setting|schedule/.test(text) ? 3 : 0.2,
    unknown: 0.5,
  };
  const total = Object.values(hits).reduce((sum, n) => sum + n, 0);
  const probabilities = Object.fromEntries(
    Object.entries(hits).map(([label, n]) => [label, n / total]),
  ) as Record<Destination, number>;
  const top = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]!;

  const hostProbabilities: Record<string, number> = { [NO_HOST]: matchedHost ? 0.1 : 0.9 };
  for (const host of KNOWN_HOSTS) {
    hostProbabilities[host.objectId] = host.objectId === matchedHost?.objectId ? 0.9 : 0.01;
  }

  const filterHits: Record<AssetFilter, number> = {
    offline: /離線|失聯|沒上線|很久|offline|stale/.test(text) ? 3 : 0.1,
    online: /上線|在線|online|有回報/.test(text) ? 3 : 0.1,
    low_compliance: /合規率低|不合規|未達標|低合規|low compliance|failing/.test(text) ? 3 : 0.1,
    high_risk: /高風險|重大漏洞|高 ?cvss|high risk/.test(text) ? 3 : 0.1,
    [NO_FILTER]: 1,
  };
  const filterTotal = Object.values(filterHits).reduce((sum, n) => sum + n, 0);
  const filterProbabilities = Object.fromEntries(
    Object.entries(filterHits).map(([label, n]) => [label, n / filterTotal]),
  ) as Record<AssetFilter, number>;
  const topFilter = Object.entries(filterProbabilities).sort((a, b) => b[1] - a[1])[0]!;

  const osHits: Record<AssetOs, number> = {
    Windows: /windows|視窗/.test(text) ? 3 : 0.1,
    Linux: /linux|rhel/.test(text) ? 3 : 0.1,
    macOS: /mac|macos|蘋果/.test(text) ? 3 : 0.1,
    [NO_OS]: 1,
  };
  const osTotal = Object.values(osHits).reduce((sum, n) => sum + n, 0);
  const osProbabilities = Object.fromEntries(
    Object.entries(osHits).map(([label, n]) => [label, n / osTotal]),
  ) as Record<AssetOs, number>;
  const topOs = Object.entries(osProbabilities).sort((a, b) => b[1] - a[1])[0]!;

  const sortHits: Record<SortField, number> = {
    risk_score: /cvss|風險分數|嚴重|危險/.test(text) ? 3 : 0.1,
    compliance_rate: /合規率|達標/.test(text) ? 3 : 0.1,
    last_seen: /最後上線|多久沒|上線時間/.test(text) ? 3 : 0.1,
    affected_hosts: /受影響|影響範圍|幾台/.test(text) ? 3 : 0.1,
    published: /公告|發布|最新/.test(text) ? 3 : 0.1,
    name: /名稱|編號|字母/.test(text) ? 3 : 0.1,
    [NO_SORT]: /排序|排列|由|從/.test(text) ? 0.4 : 2,
  };
  const sortTotal = Object.values(sortHits).reduce((sum, n) => sum + n, 0);
  const sortProbabilities = Object.fromEntries(
    Object.entries(sortHits).map(([label, n]) => [label, n / sortTotal]),
  ) as Record<SortField, number>;
  const topSort = Object.entries(sortProbabilities).sort((a, b) => b[1] - a[1])[0]!;

  const directionHits: Record<SortDirection, number> = {
    desc: /從高到低|由大到小|最高|最多|最新|最嚴重|desc/.test(text) ? 3 : 0.1,
    asc: /從低到高|由小到大|最低|最少|最舊|asc/.test(text) ? 3 : 0.1,
    [NO_DIRECTION]: 1,
  };
  const directionTotal = Object.values(directionHits).reduce((sum, n) => sum + n, 0);
  const directionProbabilities = Object.fromEntries(
    Object.entries(directionHits).map(([label, n]) => [label, n / directionTotal]),
  ) as Record<SortDirection, number>;
  const topDirection = Object.entries(directionProbabilities).sort((a, b) => b[1] - a[1])[0]!;

  const rangeHits: Record<TimeRange, number> = {
    today: /今天|今日|24 ?小時/.test(text) ? 3 : 0.1,
    week: /本週|這禮拜|一週|七天/.test(text) ? 3 : 0.1,
    month: /本月|這個月|一個月|三十天/.test(text) ? 3 : 0.1,
    quarter: /本季|一季|三個月|九十天/.test(text) ? 3 : 0.1,
    none: 1,
  };
  const rangeTotal = Object.values(rangeHits).reduce((sum, n) => sum + n, 0);
  const rangeProbabilities = Object.fromEntries(
    Object.entries(rangeHits).map(([label, n]) => [label, n / rangeTotal]),
  ) as Record<TimeRange, number>;
  const topRange = Object.entries(rangeProbabilities).sort((a, b) => b[1] - a[1])[0]!;

  const actionHits: Record<ActionId, number> = {
    export_csv: /匯出|下載|csv|報表/.test(text) ? 3 : 0.1,
    refresh: /刷新|重新整理|更新資料/.test(text) ? 3 : 0.1,
    archive_hosts: /封存|下架|移除主機/.test(text) ? 3 : 0.1,
    create_dispatch: /派送|推送更新|建立派送/.test(text) ? 3 : 0.1,
    save_view: /常用視圖|我的最愛|記住這個/.test(text) ? 3 : 0.1,
    none: 1.5,
  };
  const actionTotal = Object.values(actionHits).reduce((sum, n) => sum + n, 0);
  const actionProbabilities = Object.fromEntries(
    Object.entries(actionHits).map(([label, n]) => [label, n / actionTotal]),
  ) as Record<ActionId, number>;
  const topAction = Object.entries(actionProbabilities).sort((a, b) => b[1] - a[1])[0]!;

  const urgencyScore = /重大|緊急|嚴重|全部未修補/.test(text)
    ? 3
    : /風險|弱點|不合規/.test(text)
      ? 2
      : 0;

  const severityHits: Record<string, number> = {
    critical: /重大|critical|嚴重|9\.\d/.test(text) ? 3 : 0.1,
    high: /高風險|high/.test(text) ? 3 : 0.1,
    medium: /中風險|medium/.test(text) ? 3 : 0.1,
    low: /低風險|low/.test(text) ? 3 : 0.1,
    [NO_SEVERITY]: 1,
  };
  const severityTotal = Object.values(severityHits).reduce((sum, n) => sum + n, 0);
  const severityProbabilities = Object.fromEntries(
    Object.entries(severityHits).map(([label, n]) => [label, n / severityTotal]),
  );
  const topSeverity = Object.entries(severityProbabilities).sort((a, b) => b[1] - a[1])[0]!;

  return {
    answers: {
      destination: {
        type: "choice" as const,
        choice: top[0] as Destination,
        confidence: top[1],
        probabilities,
      },
      host: {
        type: "choice" as const,
        choice: matchedHost?.objectId ?? NO_HOST,
        confidence: matchedHost ? 0.9 : 0.6,
        probabilities: hostProbabilities,
      },
      assetFilter: {
        type: "choice" as const,
        choice: topFilter[0] as AssetFilter,
        confidence: topFilter[1],
        probabilities: filterProbabilities,
      },
      assetOs: {
        type: "choice" as const,
        choice: topOs[0] as AssetOs,
        confidence: topOs[1],
        probabilities: osProbabilities,
      },
      sortField: {
        type: "choice" as const,
        choice: topSort[0] as SortField,
        confidence: topSort[1],
        probabilities: sortProbabilities,
      },
      sortDirection: {
        type: "choice" as const,
        choice: topDirection[0] as SortDirection,
        confidence: topDirection[1],
        probabilities: directionProbabilities,
      },
      timeRange: {
        type: "choice" as const,
        choice: topRange[0] as TimeRange,
        confidence: topRange[1],
        probabilities: rangeProbabilities,
      },
      action: {
        type: "choice" as const,
        choice: topAction[0] as ActionId,
        confidence: topAction[1],
        probabilities: actionProbabilities,
      },
      destructive: {
        type: "noul" as const,
        noul: /封存|刪除|移除|派送|下架/.test(text) ? 0.9 : 0.1,
      },
      perform: {
        type: "noul" as const,
        noul: /匯出|下載|封存|派送|刷新|存成|幫我|請幫/.test(text) ? 0.85 : 0.15,
      },
      refinement: {
        type: "noul" as const,
        noul: /^(再|然後|接著|只看|改成|換成)/.test(message.trim()) ? 0.9 : 0.2,
      },
      urgency: {
        type: "score" as const,
        score: urgencyScore,
        confidence: 0.6,
        legend: Object.fromEntries(URGENCY_RUBRIC.map((text, index) => [index, text])),
        probabilities: Object.fromEntries(
          URGENCY_RUBRIC.map((_, index) => [index, index === urgencyScore ? 0.6 : 0.1]),
        ),
      },
      severity: {
        type: "choice" as const,
        choice: topSeverity[0],
        confidence: topSeverity[1],
        probabilities: severityProbabilities,
      },
      navigational: { type: "noul" as const, noul: text.trim().length > 3 ? 0.8 : 0.2 },
    },
    model: `keyword-stub (no TYPESAFE_API_KEY, from ${currentPath})`,
    mocked: true,
    /** No API call, no bill — but the shape stays the same for callers. */
    usage: undefined as { input_tokens: number; output_tokens: number } | undefined,
  };
}

export async function classify(message: string, currentPath: string, apiKey?: string) {
  const typesafe = getClient(apiKey);
  if (!typesafe) return mockAnswers(message, currentPath);

  const result = await typesafe.systemOne({
    state: {
      message,
      current_page: currentPath,
      known_hosts: KNOWN_HOSTS.map((host) => ({
        id: host.objectId,
        name: host.hostName,
        org: host.orgName,
        os: `${host.osName} ${host.osVer}`,
      })),
      severity_levels: Object.entries(SEVERITY_LABEL).map(([key, label]) => ({
        key: key as Severity,
        label,
      })),
    },
    questions: questionsFor(),
  });

  return { answers: result.answers, model: result.model, usage: result.usage, mocked: false };
}

/** Shared request handling for both hosts: dev middleware and the Cloudflare Worker. */
export async function handleIntentRequest(
  body: unknown,
  apiKey: string | undefined,
): Promise<{ status: number; payload: unknown }> {
  const { message, currentPath } = (body ?? {}) as { message?: string; currentPath?: string };
  if (!message?.trim()) return { status: 400, payload: { error: "message is required" } };
  try {
    return { status: 200, payload: await classify(message, currentPath ?? "/", apiKey) };
  } catch (error) {
    return {
      status: 502,
      payload: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}
