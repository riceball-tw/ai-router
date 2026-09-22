import App from "@/App.vue";
import { routes } from "@/router/routes";
import { expect, test } from "vite-plus/test";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter } from "vue-router";

/** Every page renders with the demo data, including the filtered and not-found cases. */
const paths = [
  "/dashboard",
  "/assets",
  "/assets?status=offline",
  "/assets?compliance=low&os=Windows",
  "/assets?risk=high",
  "/assets?sort=gcbComplianceRate&dir=asc",
  "/assets?status=offline&sort=lastSeen&dir=asc",
  "/assets/org",
  "/assets/H-1001",
  "/assets/NOPE",
  "/gcb",
  "/gcb/policy",
  "/vans",
  "/vans?severity=critical",
  "/vans?sort=cvss&dir=desc",
  "/vans?severity=high&sort=affected&dir=desc",
  "/vans?cve=CVE-2026-21445",
  "/vans/patch",
  "/system/users",
  "/system/logs",
  "/system/settings",
];

test.each(paths)("renders %s", async (path) => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const html = await renderToString(createSSRApp(App).use(router));
  expect(html.length).toBeGreaterThan(500);
});

/** The URL, not a click, is what orders the table. */
test.each([
  // CVSS 7.5 vs 6.8 — both land on page one whichever way the list runs.
  ["/vans?sort=cvss&dir=desc", "CVE-2026-15980", "CVE-2026-14488"],
  ["/vans?sort=cvss&dir=asc", "CVE-2026-14488", "CVE-2026-15980"],
])("%s sorts %s before %s", async (path, first, second) => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const html = await renderToString(createSSRApp(App).use(router));
  expect(html.indexOf(first)).toBeLessThan(html.indexOf(second));
});
