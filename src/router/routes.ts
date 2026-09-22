import type { RouteRecordRaw } from "vue-router";

/** Kept apart from the router instance so tests can mount them on a memory history. */
export const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/dashboard" },
  { path: "/dashboard", name: "dashboard", component: () => import("@/pages/Dashboard.vue") },

  { path: "/assets", name: "assets", component: () => import("@/pages/assets/HostList.vue") },
  {
    path: "/assets/org",
    name: "assets-org",
    component: () => import("@/pages/assets/OrgInfo.vue"),
  },
  {
    // After /assets/org on purpose: a literal segment must win over the param.
    path: "/assets/:id",
    name: "asset-detail",
    component: () => import("@/pages/assets/HostDetail.vue"),
  },

  { path: "/gcb", name: "gcb", component: () => import("@/pages/gcb/Compliance.vue") },
  {
    path: "/gcb/policy",
    name: "gcb-policy",
    component: () => import("@/pages/gcb/PolicySettings.vue"),
  },

  { path: "/vans", name: "vans", component: () => import("@/pages/vans/RiskList.vue") },
  {
    path: "/vans/patch",
    name: "vans-patch",
    component: () => import("@/pages/vans/PatchPlan.vue"),
  },

  {
    path: "/system/users",
    name: "system-users",
    component: () => import("@/pages/system/Users.vue"),
  },
  {
    path: "/system/logs",
    name: "system-logs",
    component: () => import("@/pages/system/ActionLogs.vue"),
  },
  {
    path: "/system/settings",
    name: "system-settings",
    component: () => import("@/pages/system/Settings.vue"),
  },
];
