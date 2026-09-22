<script setup lang="ts">
import ComplianceBar from "@/components/console/ComplianceBar.vue";
import SeverityBadge from "@/components/console/SeverityBadge.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PATCH_STATUS_LABEL,
  formatDateTime,
  gcbItemsForHost,
  gcbPolicies,
  hostById,
  relativeTime,
  vulnerabilitiesForHost,
} from "@/data/console";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const host = computed(() => hostById(String(route.params.id)));
const policy = computed(() => gcbPolicies.find((item) => item.id === host.value?.policyId));
const items = computed(() => (host.value ? gcbItemsForHost(host.value) : []));
const failed = computed(() => items.value.filter((item) => !item.passed));
const vulns = computed(() => (host.value ? vulnerabilitiesForHost(host.value.objectId) : []));
</script>

<template>
  <section v-if="host" class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">{{ host.hostName }}</h1>
      <Badge :variant="host.status === 'online' ? 'secondary' : 'outline'">
        {{ host.status === "online" ? "上線" : "離線" }}
      </Badge>
      <span class="text-muted-foreground text-xs">最後上線 {{ relativeTime(host.lastSeen) }}</span>
      <Button variant="outline" size="sm" class="ml-auto" as-child>
        <RouterLink to="/assets">回列表</RouterLink>
      </Button>
    </div>

    <div class="grid gap-3 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle class="text-sm">基本資訊</CardTitle></CardHeader>
        <CardContent>
          <dl class="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt class="text-muted-foreground">資產編號</dt>
            <dd>{{ host.objectId }}</dd>
            <dt class="text-muted-foreground">單位名稱</dt>
            <dd>{{ host.orgName }}</dd>
            <dt class="text-muted-foreground">保管人</dt>
            <dd>{{ host.owner }}</dd>
            <dt class="text-muted-foreground">位置</dt>
            <dd>{{ host.place }}</dd>
            <dt class="text-muted-foreground">IP 位址</dt>
            <dd>{{ host.ipAddress.join(", ") }}</dd>
            <dt class="text-muted-foreground">MAC</dt>
            <dd class="truncate">{{ host.macAddress.join(", ") }}</dd>
            <dt class="text-muted-foreground">作業系統</dt>
            <dd>{{ host.osName }} {{ host.osVer }}</dd>
            <dt class="text-muted-foreground">代理版本</dt>
            <dd>{{ host.agentVer }}</dd>
            <dt class="text-muted-foreground">最後掃描</dt>
            <dd>{{ formatDateTime(host.lastSeen) }}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-sm">
            組態合規
            <span class="text-muted-foreground font-normal"
              >{{ policy?.name }} {{ policy?.version }}</span
            >
            <ComplianceBar class="ml-auto" :rate="host.gcbComplianceRate" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground mb-2 text-xs">
            不合規 {{ failed.length }} / {{ items.length }} 項（展示資料僅列出部分基準項目）
          </p>
          <ul class="divide-y text-sm">
            <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-1.5">
              <span
                class="inline-flex h-5 items-center rounded-full px-2 text-xs font-medium"
                :class="
                  item.passed
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/15 text-destructive'
                "
              >
                {{ item.passed ? "合規" : "不合規" }}
              </span>
              <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
              <span class="text-muted-foreground text-xs"
                >{{ item.category }}・{{ item.level }}</span
              >
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader
        ><CardTitle class="text-sm">弱點清單（{{ vulns.length }}）</CardTitle></CardHeader
      >
      <CardContent>
        <p v-if="!vulns.length" class="text-muted-foreground py-6 text-center text-sm">
          無已知弱點
        </p>
        <ul v-else class="divide-y text-sm">
          <li
            v-for="vuln in vulns"
            :key="vuln.cveId"
            class="flex flex-wrap items-center gap-3 py-2"
          >
            <SeverityBadge :severity="vuln.severity" />
            <RouterLink
              :to="{ path: '/vans', query: { cve: vuln.cveId } }"
              class="font-medium underline-offset-4 hover:underline"
            >
              {{ vuln.cveId }}
            </RouterLink>
            <span class="text-muted-foreground min-w-0 flex-1 truncate">{{ vuln.title }}</span>
            <span class="tabular-nums">CVSS {{ vuln.cvss.toFixed(1) }}</span>
            <Badge variant="outline">{{ PATCH_STATUS_LABEL[vuln.patchStatus] }}</Badge>
          </li>
        </ul>
      </CardContent>
    </Card>
  </section>

  <section v-else class="space-y-3 p-8 text-center">
    <p class="text-muted-foreground">找不到資產 {{ route.params.id }}</p>
    <Button variant="outline" size="sm" as-child
      ><RouterLink to="/assets">回列表</RouterLink></Button
    >
  </section>
</template>
