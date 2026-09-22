/**
 * Fake data for the console demo, shaped after a real security-audit console
 * (assets → configuration baseline (GCB) → vulnerabilities (VANS) → system).
 *
 * Everything is generated from a fixed seed so the tables, the dashboard numbers
 * and the ids the classifier is told about stay the same on every reload — the
 * demo is about the UI and the routing, not about randomness.
 */

export type OsName = "Windows" | "Linux" | "macOS";
export type HostStatus = "online" | "offline";
export type Severity = "critical" | "high" | "medium" | "low";
export type PatchStatus = "unpatched" | "patching" | "patched" | "accepted";

export interface OrgNode {
  id: number;
  name: string;
  parentId: number | null;
}

export interface Host {
  objectId: string;
  hostName: string;
  orgId: number;
  orgName: string;
  ipAddress: string[];
  macAddress: string[];
  agentVer: string;
  osName: OsName;
  osVer: string;
  status: HostStatus;
  lastSeen: string;
  /** 0–100, the share of baseline items this host passes. */
  gcbComplianceRate: number;
  policyId: string;
  cvssScore: number;
  owner: string;
  place: string;
}

export interface GcbPolicy {
  id: string;
  name: string;
  os: OsName;
  version: string;
  itemCount: number;
  updatedAt: string;
}

export interface GcbItem {
  id: string;
  title: string;
  category: string;
  level: "L1" | "L2";
  passed: boolean;
}

export interface Vulnerability {
  cveId: string;
  title: string;
  severity: Severity;
  cvss: number;
  software: string;
  publishedAt: string;
  patchStatus: PatchStatus;
  affectedHostIds: string[];
}

export interface ActionLog {
  id: string;
  at: string;
  account: string;
  action: string;
  target: string;
  ip: string;
  result: "success" | "failed";
}

export interface ConsoleUser {
  account: string;
  name: string;
  role: "系統管理員" | "稽核人員" | "唯讀使用者";
  orgName: string;
  lastLogin: string;
  status: "啟用" | "停用";
}

/** Deterministic PRNG (mulberry32) — same table on every load. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(20260922);

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(random() * list.length)]!;
}

function int(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** ISO date `days` before the demo's "today", so relative times read sensibly. */
const NOW = new Date("2026-09-22T09:00:00+08:00");

function ago(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

export const orgs: OrgNode[] = [
  { id: 1, name: "總部", parentId: null },
  { id: 11, name: "資訊處", parentId: 1 },
  { id: 12, name: "人事處", parentId: 1 },
  { id: 13, name: "主計處", parentId: 1 },
  { id: 14, name: "政風室", parentId: 1 },
  { id: 21, name: "中區辦公室", parentId: null },
  { id: 22, name: "南區辦公室", parentId: null },
  { id: 23, name: "研發中心", parentId: null },
];

const leafOrgs = orgs.filter((org) => org.id !== 1);

export const gcbPolicies: GcbPolicy[] = [
  {
    id: "POL-W11",
    name: "Windows 11 政府組態基準",
    os: "Windows",
    version: "v2.1",
    itemCount: 186,
    updatedAt: "2026-08-14",
  },
  {
    id: "POL-W10",
    name: "Windows 10 政府組態基準",
    os: "Windows",
    version: "v1.9",
    itemCount: 174,
    updatedAt: "2026-05-30",
  },
  {
    id: "POL-SRV",
    name: "Windows Server 2022 基準",
    os: "Windows",
    version: "v1.4",
    itemCount: 203,
    updatedAt: "2026-07-02",
  },
  {
    id: "POL-RHEL",
    name: "RHEL 9 安全組態基準",
    os: "Linux",
    version: "v1.2",
    itemCount: 148,
    updatedAt: "2026-06-11",
  },
  {
    id: "POL-MAC",
    name: "macOS 15 安全組態基準",
    os: "macOS",
    version: "v1.0",
    itemCount: 121,
    updatedAt: "2026-04-25",
  },
];

const osProfiles: { osName: OsName; versions: string[]; policyId: string }[] = [
  { osName: "Windows", versions: ["11 23H2", "11 24H2"], policyId: "POL-W11" },
  { osName: "Windows", versions: ["10 22H2"], policyId: "POL-W10" },
  { osName: "Windows", versions: ["Server 2022"], policyId: "POL-SRV" },
  { osName: "Linux", versions: ["RHEL 9.4", "RHEL 9.3"], policyId: "POL-RHEL" },
  { osName: "macOS", versions: ["15.1", "15.0"], policyId: "POL-MAC" },
];

const owners = [
  "王小明",
  "李佩珊",
  "陳建豪",
  "林雅婷",
  "黃詩涵",
  "張志偉",
  "吳冠廷",
  "劉宜蓁",
  "蔡承翰",
  "鄭家豪",
];

const places = ["A 棟 3F", "A 棟 5F", "B 棟 2F", "B 棟 7F", "機房 R1", "機房 R2", "外勤"];
const sitePrefix = ["TPE", "TXG", "KHH", "HSZ"];

function mac(): string {
  return Array.from({ length: 6 }, () =>
    int(0, 255).toString(16).padStart(2, "0").toUpperCase(),
  ).join(":");
}

export const hosts: Host[] = Array.from({ length: 64 }, (_, index) => {
  const profile = pick(osProfiles);
  const org = pick(leafOrgs);
  const online = random() > 0.22;
  const prefix = pick(sitePrefix);
  const isServer = profile.policyId === "POL-SRV";

  return {
    objectId: `H-${String(1001 + index)}`,
    hostName: `${prefix}-${isServer ? "SRV" : "PC"}-${String(index + 1).padStart(4, "0")}`,
    orgId: org.id,
    orgName: org.name,
    ipAddress: [`10.${int(1, 30)}.${int(0, 255)}.${int(2, 250)}`],
    macAddress: [mac()],
    agentVer: pick(["3.8.2", "3.8.1", "3.7.6"]),
    osName: profile.osName,
    osVer: pick(profile.versions),
    status: online ? "online" : "offline",
    lastSeen: ago(online ? int(1, 180) : int(1_440, 30_240)),
    gcbComplianceRate: int(48, 100),
    policyId: profile.policyId,
    cvssScore: Number((random() * 9.8).toFixed(1)),
    owner: pick(owners),
    place: pick(places),
  } satisfies Host;
});

export function hostById(objectId: string): Host | undefined {
  return hosts.find((host) => host.objectId === objectId);
}

export function hostsByPolicy(policyId: string): Host[] {
  return hosts.filter((host) => host.policyId === policyId);
}

/** Per-policy rollup shown on 合規檢視. */
export interface PolicyCompliance extends GcbPolicy {
  hostCount: number;
  passRate: number;
  failedHostCount: number;
}

export const policyCompliance: PolicyCompliance[] = gcbPolicies.map((policy) => {
  const applied = hostsByPolicy(policy.id);
  const passRate = applied.length
    ? Math.round(applied.reduce((sum, host) => sum + host.gcbComplianceRate, 0) / applied.length)
    : 0;
  return {
    ...policy,
    hostCount: applied.length,
    passRate,
    failedHostCount: applied.filter((host) => host.gcbComplianceRate < 80).length,
  };
});

const gcbCategories = [
  "帳號原則",
  "稽核原則",
  "安全性選項",
  "Windows Defender",
  "防火牆設定",
  "遠端桌面",
  "系統服務",
];

const gcbTitles = [
  "密碼最短長度須為 12 字元以上",
  "帳戶鎖定閾值須設定為 5 次",
  "停用來賓帳戶",
  "啟用登入失敗稽核",
  "停用 SMBv1 通訊協定",
  "開啟即時防護",
  "限制遠端桌面僅允許網路層級驗證",
  "停用自動播放功能",
  "啟用防火牆網域設定檔",
  "禁止儲存 LAN Manager 雜湊值",
  "限制匿名列舉 SAM 帳戶",
  "啟用螢幕保護程式密碼鎖定",
];

/** Baseline result rows for one host — derived from its id so the page is stable. */
export function gcbItemsForHost(host: Host): GcbItem[] {
  const local = seeded(Number(host.objectId.slice(2)));
  return gcbTitles.map((title, index) => ({
    id: `${host.policyId}-${String(index + 1).padStart(3, "0")}`,
    title,
    category: gcbCategories[index % gcbCategories.length]!,
    level: index % 3 === 0 ? "L2" : "L1",
    passed: local() * 100 < host.gcbComplianceRate,
  }));
}

const vulnSeeds: Omit<Vulnerability, "affectedHostIds">[] = [
  {
    cveId: "CVE-2026-21445",
    title: "Windows LSASS 權限提升漏洞",
    severity: "critical",
    cvss: 9.8,
    software: "Microsoft Windows 11",
    publishedAt: "2026-09-09",
    patchStatus: "unpatched",
  },
  {
    cveId: "CVE-2026-20918",
    title: "SMB 伺服器遠端程式碼執行",
    severity: "critical",
    cvss: 9.1,
    software: "Microsoft Windows Server 2022",
    publishedAt: "2026-08-12",
    patchStatus: "patching",
  },
  {
    cveId: "CVE-2026-19022",
    title: "OpenSSH 認證繞過",
    severity: "high",
    cvss: 8.6,
    software: "OpenSSH 9.6",
    publishedAt: "2026-07-30",
    patchStatus: "unpatched",
  },
  {
    cveId: "CVE-2026-18877",
    title: "Google Chrome V8 型別混淆",
    severity: "high",
    cvss: 8.3,
    software: "Google Chrome 141",
    publishedAt: "2026-09-02",
    patchStatus: "patching",
  },
  {
    cveId: "CVE-2026-17650",
    title: "Adobe Acrobat Reader 記憶體毀損",
    severity: "high",
    cvss: 7.8,
    software: "Adobe Acrobat Reader DC",
    publishedAt: "2026-06-18",
    patchStatus: "patched",
  },
  {
    cveId: "CVE-2026-16344",
    title: "7-Zip 路徑穿越",
    severity: "medium",
    cvss: 6.5,
    software: "7-Zip 24.05",
    publishedAt: "2026-05-21",
    patchStatus: "accepted",
  },
  {
    cveId: "CVE-2026-15980",
    title: "OpenSSL 憑證驗證缺陷",
    severity: "high",
    cvss: 7.5,
    software: "OpenSSL 3.2.1",
    publishedAt: "2026-08-28",
    patchStatus: "unpatched",
  },
  {
    cveId: "CVE-2026-15012",
    title: "Apache Log4j 反序列化",
    severity: "critical",
    cvss: 9.4,
    software: "Apache Log4j 2.20",
    publishedAt: "2026-04-03",
    patchStatus: "patched",
  },
  {
    cveId: "CVE-2026-14488",
    title: "Firefox 沙箱逃逸",
    severity: "medium",
    cvss: 6.8,
    software: "Mozilla Firefox 132",
    publishedAt: "2026-07-14",
    patchStatus: "patching",
  },
  {
    cveId: "CVE-2026-13901",
    title: "macOS 核心權限提升",
    severity: "high",
    cvss: 7.9,
    software: "Apple macOS 15",
    publishedAt: "2026-09-15",
    patchStatus: "unpatched",
  },
  {
    cveId: "CVE-2026-12770",
    title: "Zoom 用戶端資訊洩漏",
    severity: "low",
    cvss: 3.9,
    software: "Zoom Workplace 6.2",
    publishedAt: "2026-03-27",
    patchStatus: "accepted",
  },
  {
    cveId: "CVE-2026-11233",
    title: "Notepad++ DLL 劫持",
    severity: "medium",
    cvss: 5.5,
    software: "Notepad++ 8.6",
    publishedAt: "2026-02-19",
    patchStatus: "patched",
  },
];

export const vulnerabilities: Vulnerability[] = vulnSeeds.map((vuln) => {
  const pool = hosts.filter((host) => {
    if (vuln.software.includes("macOS")) return host.osName === "macOS";
    if (vuln.software.includes("OpenSSH") || vuln.software.includes("OpenSSL"))
      return host.osName === "Linux";
    if (vuln.software.includes("Server")) return host.policyId === "POL-SRV";
    if (vuln.software.includes("Windows")) return host.osName === "Windows";
    return true;
  });
  const count = Math.max(1, Math.round(pool.length * (0.15 + random() * 0.5)));
  return { ...vuln, affectedHostIds: pool.slice(0, count).map((host) => host.objectId) };
});

export function vulnerabilitiesForHost(objectId: string): Vulnerability[] {
  return vulnerabilities.filter((vuln) => vuln.affectedHostIds.includes(objectId));
}

export function vulnerabilityById(cveId: string): Vulnerability | undefined {
  return vulnerabilities.find((vuln) => vuln.cveId === cveId);
}

const logActions = [
  "登入系統",
  "匯出資產清單",
  "派送修補程式",
  "編輯組態基準",
  "新增使用者",
  "執行合規掃描",
  "封存主機",
  "修改通報設定",
];

export const actionLogs: ActionLog[] = Array.from({ length: 40 }, (_, index) => ({
  id: `LOG-${String(9001 + index)}`,
  at: ago(index * 47 + int(1, 40)),
  account: pick(["admin", "auditor01", "auditor02", "rd_viewer", "it_ops"]),
  action: pick(logActions),
  target: pick([...hosts.slice(0, 12).map((host) => host.hostName), "全系統", "POL-W11"]),
  ip: `172.20.${int(0, 30)}.${int(2, 250)}`,
  result: random() > 0.12 ? "success" : "failed",
}));

export const consoleUsers: ConsoleUser[] = [
  {
    account: "admin",
    name: "系統管理員",
    role: "系統管理員",
    orgName: "資訊處",
    lastLogin: ago(35),
    status: "啟用",
  },
  {
    account: "auditor01",
    name: "李佩珊",
    role: "稽核人員",
    orgName: "政風室",
    lastLogin: ago(190),
    status: "啟用",
  },
  {
    account: "auditor02",
    name: "陳建豪",
    role: "稽核人員",
    orgName: "中區辦公室",
    lastLogin: ago(1_580),
    status: "啟用",
  },
  {
    account: "it_ops",
    name: "張志偉",
    role: "系統管理員",
    orgName: "資訊處",
    lastLogin: ago(420),
    status: "啟用",
  },
  {
    account: "rd_viewer",
    name: "吳冠廷",
    role: "唯讀使用者",
    orgName: "研發中心",
    lastLogin: ago(11_000),
    status: "停用",
  },
];

export interface DashboardStats {
  total: number;
  online: number;
  offline: number;
  avgCompliance: number;
  criticalVulns: number;
  unpatchedHosts: number;
}

export const dashboardStats: DashboardStats = {
  total: hosts.length,
  online: hosts.filter((host) => host.status === "online").length,
  offline: hosts.filter((host) => host.status === "offline").length,
  avgCompliance: Math.round(
    hosts.reduce((sum, host) => sum + host.gcbComplianceRate, 0) / hosts.length,
  ),
  criticalVulns: vulnerabilities.filter((vuln) => vuln.severity === "critical").length,
  unpatchedHosts: new Set(
    vulnerabilities
      .filter((vuln) => vuln.patchStatus === "unpatched")
      .flatMap((vuln) => vuln.affectedHostIds),
  ).size,
};

export const severityBreakdown: { severity: Severity; count: number }[] = (
  ["critical", "high", "medium", "low"] as const
).map((severity) => ({
  severity,
  count: vulnerabilities
    .filter((vuln) => vuln.severity === severity)
    .reduce((sum, vuln) => sum + vuln.affectedHostIds.length, 0),
}));

export const osBreakdown: { osName: OsName; count: number }[] = (
  ["Windows", "Linux", "macOS"] as const
).map((osName) => ({
  osName,
  count: hosts.filter((host) => host.osName === osName).length,
}));

export const complianceByOrg: { orgName: string; rate: number; hostCount: number }[] = leafOrgs
  .map((org) => {
    const members = hosts.filter((host) => host.orgId === org.id);
    return {
      orgName: org.name,
      hostCount: members.length,
      rate: members.length
        ? Math.round(
            members.reduce((sum, host) => sum + host.gcbComplianceRate, 0) / members.length,
          )
        : 0,
    };
  })
  .sort((a, b) => a.rate - b.rate);

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "重大",
  high: "高",
  medium: "中",
  low: "低",
};

export const PATCH_STATUS_LABEL: Record<PatchStatus, string> = {
  unpatched: "未修補",
  patching: "修補中",
  patched: "已修補",
  accepted: "風險接受",
};

/** "3 分鐘前" / "2 天前", computed against the demo's fixed now. */
export function relativeTime(iso: string): string {
  const minutes = Math.round((NOW.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} 小時前`;
  return `${Math.round(minutes / 1_440)} 天前`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
