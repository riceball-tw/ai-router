<script setup lang="ts">
import ComplianceBarList from "@/components/console/ComplianceBarList.vue";
import SeverityBadge from "@/components/console/SeverityBadge.vue";
import SeverityDonut from "@/components/console/SeverityDonut.vue";
import StatCard from "@/components/console/StatCard.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  complianceByOrg,
  dashboardStats,
  hosts,
  osBreakdown,
  relativeTime,
  severityBreakdown,
  vulnerabilities,
} from "@/data/console";
import { BugIcon, MonitorIcon, ShieldAlertIcon, ShieldCheckIcon } from "@lucide/vue";
import { computed } from "vue";

const topRisk = computed(() =>
  [...vulnerabilities]
    .sort((a, b) => b.cvss - a.cvss || b.affectedHostIds.length - a.affectedHostIds.length)
    .slice(0, 5),
);

const staleHosts = computed(() =>
  [...hosts].filter((host) => host.status === "offline").slice(0, 5),
);
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">儀表板</h1>
      <p class="text-muted-foreground text-xs">資料為展示用假資料，更新於 2026-09-22 09:00</p>
      <Button variant="outline" size="sm" class="ml-auto" disabled>刷新</Button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="納管主機"
        :value="dashboardStats.total"
        :hint="`上線 ${dashboardStats.online}・離線 ${dashboardStats.offline}`"
        :icon="MonitorIcon"
      />
      <StatCard
        label="平均組態合規率"
        :value="`${dashboardStats.avgCompliance}%`"
        hint="門檻 85%"
        :icon="ShieldCheckIcon"
        :tone="dashboardStats.avgCompliance < 85 ? 'warning' : 'default'"
      />
      <StatCard
        label="重大弱點"
        :value="dashboardStats.criticalVulns"
        hint="CVSS ≥ 9.0"
        :icon="BugIcon"
        tone="danger"
      />
      <StatCard
        label="待修補主機"
        :value="dashboardStats.unpatchedHosts"
        hint="至少一項未修補弱點"
        :icon="ShieldAlertIcon"
        tone="warning"
      />
    </div>

    <div class="grid gap-3 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">弱點風險分布（受影響主機數）</CardTitle>
        </CardHeader>
        <CardContent>
          <SeverityDonut :data="severityBreakdown" />
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="text-sm">各單位組態合規率</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceBarList :data="complianceByOrg" />
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-3 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="text-sm">高風險弱點 Top 5</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="divide-y text-sm">
            <li
              v-for="vuln in topRisk"
              :key="vuln.cveId"
              class="flex items-center gap-3 py-2 first:pt-0"
            >
              <SeverityBadge :severity="vuln.severity" />
              <RouterLink
                :to="{ path: '/vans', query: { cve: vuln.cveId } }"
                class="font-medium underline-offset-4 hover:underline"
              >
                {{ vuln.cveId }}
              </RouterLink>
              <span class="text-muted-foreground min-w-0 flex-1 truncate">{{ vuln.title }}</span>
              <span class="tabular-nums">{{ vuln.affectedHostIds.length }} 台</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-sm">作業系統分布</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <ul class="space-y-1.5 text-sm">
            <li v-for="row in osBreakdown" :key="row.osName" class="flex items-center gap-2">
              <span class="text-muted-foreground">{{ row.osName }}</span>
              <span class="ml-auto tabular-nums">{{ row.count }} 台</span>
            </li>
          </ul>
          <div>
            <p class="text-muted-foreground mb-1.5 text-xs">長時間離線主機</p>
            <ul class="space-y-1 text-sm">
              <li v-for="host in staleHosts" :key="host.objectId" class="flex items-center gap-2">
                <RouterLink
                  :to="{ name: 'asset-detail', params: { id: host.objectId } }"
                  class="truncate underline-offset-4 hover:underline"
                >
                  {{ host.hostName }}
                </RouterLink>
                <span class="text-muted-foreground ml-auto text-xs whitespace-nowrap">
                  {{ relativeTime(host.lastSeen) }}
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
