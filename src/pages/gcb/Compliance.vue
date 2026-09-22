<script setup lang="ts">
import ComplianceBar from "@/components/console/ComplianceBar.vue";
import DataTable from "@/components/console/DataTable.vue";
import type { Column } from "@/components/console/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hosts, policyCompliance, type Host, type PolicyCompliance } from "@/data/console";
import { computed, ref } from "vue";

const selectedPolicy = ref<string | null>(null);

const policyColumns: Column<PolicyCompliance>[] = [
  { key: "name", title: "基準名稱", sortable: true, value: (row) => row.name },
  { key: "version", title: "版本", value: (row) => row.version },
  { key: "os", title: "適用系統", sortable: true, value: (row) => row.os },
  {
    key: "itemCount",
    title: "檢測項目",
    sortable: true,
    align: "end",
    value: (row) => row.itemCount,
  },
  {
    key: "hostCount",
    title: "套用主機",
    sortable: true,
    align: "end",
    value: (row) => row.hostCount,
  },
  { key: "passRate", title: "平均合規率", sortable: true, value: (row) => row.passRate },
  {
    key: "failedHostCount",
    title: "未達標主機",
    sortable: true,
    align: "end",
    value: (row) => row.failedHostCount,
  },
  { key: "updatedAt", title: "更新日期", sortable: true, value: (row) => row.updatedAt },
];

const hostColumns: Column<Host>[] = [
  { key: "hostName", title: "電腦名稱", sortable: true, value: (row) => row.hostName },
  { key: "orgName", title: "單位名稱", sortable: true, value: (row) => row.orgName },
  { key: "osVer", title: "系統版本", value: (row) => `${row.osName} ${row.osVer}` },
  {
    key: "gcbComplianceRate",
    title: "合規率",
    sortable: true,
    value: (row) => row.gcbComplianceRate,
  },
];

const drillHosts = computed(() =>
  selectedPolicy.value ? hosts.filter((host) => host.policyId === selectedPolicy.value) : [],
);

const drillPolicy = computed(() =>
  policyCompliance.find((policy) => policy.id === selectedPolicy.value),
);
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">合規檢視</h1>
      <p class="text-muted-foreground text-xs">以組態基準彙總，點一列展開該基準的主機</p>
    </div>

    <Card>
      <CardContent>
        <DataTable
          :columns="policyColumns"
          :data="policyCompliance"
          :row-key="(row: PolicyCompliance) => row.id"
          :search="(row: PolicyCompliance) => `${row.name} ${row.os} ${row.version}`"
          search-placeholder="搜尋基準⋯⋯"
          :page-size="10"
          @row-click="(row: PolicyCompliance) => (selectedPolicy = row.id)"
        >
          <template #cell-name="{ row }">
            <button type="button" class="font-medium underline-offset-4 hover:underline">
              {{ row.name }}
            </button>
          </template>
          <template #cell-passRate="{ row }">
            <ComplianceBar :rate="row.passRate" />
          </template>
          <template #cell-failedHostCount="{ row }">
            <Badge :variant="row.failedHostCount ? 'destructive' : 'outline'">
              {{ row.failedHostCount }}
            </Badge>
          </template>
        </DataTable>
      </CardContent>
    </Card>

    <Card v-if="drillPolicy">
      <CardContent class="space-y-3">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-medium">{{ drillPolicy.name }}・套用主機</h2>
          <Button variant="ghost" size="xs" class="ml-auto" @click="selectedPolicy = null">
            收合
          </Button>
        </div>
        <DataTable
          :columns="hostColumns"
          :data="drillHosts"
          :row-key="(row: Host) => row.objectId"
          :search="(row: Host) => `${row.hostName} ${row.orgName}`"
          search-placeholder="搜尋主機⋯⋯"
          :page-size="8"
        >
          <template #cell-hostName="{ row }">
            <RouterLink
              :to="{ name: 'asset-detail', params: { id: row.objectId } }"
              class="font-medium underline-offset-4 hover:underline"
            >
              {{ row.hostName }}
            </RouterLink>
          </template>
          <template #cell-gcbComplianceRate="{ row }">
            <ComplianceBar :rate="row.gcbComplianceRate" />
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
