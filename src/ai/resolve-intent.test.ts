import type { Destination, IntentAnswers } from "@/ai/intents";
import { resolveIntent } from "@/ai/resolve-intent";
import { expect, test } from "vite-plus/test";

/** A confident answer sheet; each test overrides only the parts it cares about. */
function answers(overrides: Partial<Record<keyof IntentAnswers, unknown>> = {}): IntentAnswers {
  const choice = (value: string) => ({
    type: "choice" as const,
    choice: value,
    confidence: 1,
    probabilities: { [value]: 1 },
  });
  return {
    destination: choice("assets"),
    host: choice("none"),
    severity: choice("none"),
    assetFilter: choice("none"),
    assetOs: choice("none"),
    sortField: choice("none"),
    sortDirection: choice("none"),
    timeRange: choice("none"),
    action: choice("none"),
    destructive: { type: "noul", noul: 0.1 },
    refinement: { type: "noul", noul: 0.1 },
    urgency: { type: "score", score: 0, confidence: 1, legend: {}, probabilities: {} },
    navigational: { type: "noul", noul: 0.9 },
    ...overrides,
  } as IntentAnswers;
}

const choice = (value: string) => ({
  type: "choice" as const,
  choice: value,
  confidence: 1,
  probabilities: { [value]: 1 },
});

test("host filters and ordering both land in the query", () => {
  const resolved = resolveIntent(
    answers({
      assetFilter: choice("offline"),
      assetOs: choice("Windows"),
      sortField: choice("compliance_rate"),
      sortDirection: choice("asc"),
    }),
  );
  expect(resolved?.route).toEqual({
    name: "assets",
    query: { status: "offline", os: "Windows", sort: "gcbComplianceRate", dir: "asc" },
  });
  expect(resolved?.applied).toEqual(["離線", "Windows", "合規率↑"]);
});

test("a page without those columns ignores the answers it cannot show", () => {
  const resolved = resolveIntent(
    answers({ destination: choice("gcb_policy"), sortField: choice("risk_score") }),
  );
  expect(resolved?.route).toEqual({ name: "gcb-policy", query: {} });
  expect(resolved?.applied).toEqual([]);
});

test("the vulnerability list keeps severity and its own sort column", () => {
  const resolved = resolveIntent(
    answers({
      destination: choice("vans_risk"),
      severity: choice("critical"),
      sortField: choice("risk_score"),
      sortDirection: choice("desc"),
    }),
  );
  expect(resolved?.route).toEqual({
    name: "vans",
    query: { severity: "critical", sort: "cvss", dir: "desc" },
  });
});

test("host filters dropped elsewhere name the page that can show them", () => {
  const resolved = resolveIntent(
    answers({ destination: choice("gcb_compliance"), assetFilter: choice("high_risk") }),
  );
  expect(resolved?.dropped).toEqual({ labels: ["CVSS ≥ 7"], on: "assets" });
});

test("overriding the page re-applies the same answers onto it", () => {
  const sheet = answers({
    destination: choice("gcb_compliance"),
    assetFilter: choice("high_risk"),
    sortField: choice("risk_score"),
  });
  // What the "did you mean 主機列表" button does.
  const resolved = resolveIntent(sheet, "assets" as Destination);
  expect(resolved?.route).toEqual({
    name: "assets",
    query: { risk: "high", sort: "cvssScore", dir: "desc" },
  });
  expect(resolved?.applied).toEqual(["CVSS ≥ 7", "風險分數↓"]);
});

test("a named host wins over every filter", () => {
  const resolved = resolveIntent(
    answers({ destination: choice("asset_detail"), host: choice("H-1001") }),
  );
  expect(resolved?.route).toEqual({ name: "asset-detail", params: { id: "H-1001" } });
});

test("an unsure filter is dropped, the page still opens", () => {
  const resolved = resolveIntent(
    answers({
      assetFilter: { type: "choice", choice: "offline", confidence: 0.4, probabilities: {} },
    }),
  );
  expect(resolved?.route).toEqual({ name: "assets", query: {} });
});

test("unknown resolves to nothing", () => {
  expect(resolveIntent(answers({ destination: choice("unknown") }))).toBeNull();
});

test("a refinement builds on the query already in the URL", () => {
  const resolved = resolveIntent(
    answers({
      assetOs: choice("Windows"),
      refinement: { type: "noul", noul: 0.9 },
    }),
    "assets",
    { routeName: "assets", query: { status: "offline" } },
  );
  expect(resolved?.route).toEqual({ name: "assets", query: { status: "offline", os: "Windows" } });
  expect(resolved?.refining).toBe(true);
});

test("a refinement of a different page starts clean", () => {
  const resolved = resolveIntent(
    answers({ assetOs: choice("Windows"), refinement: { type: "noul", noul: 0.9 } }),
    "assets",
    { routeName: "vans", query: { severity: "critical" } },
  );
  expect(resolved?.route).toEqual({ name: "assets", query: { os: "Windows" } });
});

test("the time window lands only on pages with a date column", () => {
  const onLogs = resolveIntent(
    answers({ destination: choice("system_logs"), timeRange: choice("week") }),
  );
  expect(onLogs?.route).toEqual({ name: "system-logs", query: { since: "week" } });

  const onUsers = resolveIntent(
    answers({ destination: choice("system_users"), timeRange: choice("week") }),
  );
  expect(onUsers?.route).toEqual({ name: "system-users", query: {} });
});
