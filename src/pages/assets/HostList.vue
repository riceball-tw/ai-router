<script setup lang="ts">
import ComplianceBar from "@/components/console/ComplianceBar.vue";
import type { Column } from "@/components/console/data-table";
import DataTable from "@/components/console/DataTable.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { registerActions } from "@/ai/actions";
import { gcbPolicies, hosts, relativeTime, type Host } from "@/data/console";
import { archivedHosts, archiveHosts, downloadCsv } from "@/data/console-state";
import { parseSortQuery } from "@/lib/sort-query";
import {
  applyAssetQuery,
  ASSET_SORTABLE,
  describeAssetQuery,
  parseAssetQuery,
  type AssetQuery,
} from "@/pages/assets/asset-filters";
import { XIcon } from "@lucide/vue";
import { computed, onScopeDispose } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/** The single source of filter state: the URL. Buttons and the intent chat both write it. */
const filters = computed(() => parseAssetQuery(route.query));
const chips = computed(() => describeAssetQuery(filters.value));

const rows = computed(() => {
  const live = hosts.filter((host) => !archivedHosts.value.has(host.objectId));
  const filtered = applyAssetQuery(live, filters.value);
  // "離線很久" is a sort as much as a filter: oldest check-in first.
  return filters.value.status === "offline"
    ? [...filtered].sort((a, b) => a.lastSeen.localeCompare(b.lastSeen))
    : filtered;
});

/** Sort lives in the same query string, so a header click is a shareable URL too. */
const sortState = computed(() => parseSortQuery(route.query, ASSET_SORTABLE));

const sortKey = computed({
  get: () => sortState.value.sort,
  set: (value) => writeQuery({ sort: value ?? undefined, dir: value ? "asc" : undefined }),
});

const sortDesc = computed({
  get: () => sortState.value.desc,
  set: (value) => writeQuery({ dir: value ? "desc" : "asc" }),
});

function writeQuery(patch: Record<string, string | undefined>) {
  const query: Record<string, string> = { ...(route.query as Record<string, string>) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete query[key];
    else query[key] = value;
  }
  void router.replace({ name: "assets", query });
}

function setFilters(next: AssetQuery) {
  const sort = route.query.sort;
  const dir = route.query.dir;
  void router.replace({
    name: "assets",
    query: {
      ...next,
      ...(typeof sort === "string" ? { sort } : {}),
      ...(typeof dir === "string" ? { dir } : {}),
    },
  });
}

function toggle(patch: AssetQuery) {
  const [key, value] = Object.entries(patch)[0] as [keyof AssetQuery, string];
  const next = { ...filters.value };
  if (next[key] === value) delete next[key];
  else Object.assign(next, patch);
  setFilters(next);
}

function isOn(patch: AssetQuery): boolean {
  const [key, value] = Object.entries(patch)[0] as [keyof AssetQuery, string];
  return filters.value[key] === value;
}

function clearChip(key: keyof AssetQuery) {
  const next = { ...filters.value };
  delete next[key];
  setFilters(next);
}

const policyName = (id: string) => gcbPolicies.find((policy) => policy.id === id)?.name ?? "—";

const columns: Column<Host>[] = [
  { key: "hostName", title: "電腦名稱", sortable: true, value: (host) => host.hostName },
  { key: "orgName", title: "單位名稱", sortable: true, value: (host) => host.orgName },
  { key: "ipAddress", title: "網路資訊", value: (host) => host.ipAddress.join(", ") },
  {
    key: "osName",
    title: "作業系統",
    sortable: true,
    value: (host) => `${host.osName} ${host.osVer}`,
  },
  { key: "agentVer", title: "代理版本", sortable: true, value: (host) => host.agentVer },
  {
    key: "gcbComplianceRate",
    title: "組態合規率",
    sortable: true,
    value: (host) => host.gcbComplianceRate,
  },
  {
    key: "cvssScore",
    title: "最高 CVSS",
    sortable: true,
    align: "end",
    value: (host) => host.cvssScore,
  },
  { key: "status", title: "狀態", sortable: true, value: (host) => host.status },
  { key: "lastSeen", title: "最後上線", sortable: true, value: (host) => host.lastSeen },
];

/**
 * What the chat may run while this page is open. `archive_hosts` is in the DESTRUCTIVE
 * table, so the chat asks before calling `run` — the handler itself just does the work.
 */
onScopeDispose(
  registerActions({
    refresh: {
      describe: () => `重新讀取 ${rows.value.length} 台主機`,
      run: () => {},
    },
    export_csv: {
      describe: () => `匯出 ${rows.value.length} 台主機`,
      run: () =>
        downloadCsv(
          "hosts.csv",
          ["電腦名稱", "單位", "IP", "作業系統", "合規率", "最高 CVSS", "狀態"],
          rows.value.map((host) => [
            host.hostName,
            host.orgName,
            host.ipAddress.join(" "),
            `${host.osName} ${host.osVer}`,
            host.gcbComplianceRate,
            host.cvssScore,
            host.status,
          ]),
        ),
    },
    archive_hosts: {
      describe: () => `要封存目前列出的 ${rows.value.length} 台主機嗎？`,
      run: () => archiveHosts(rows.value.map((host) => host.objectId)),
    },
  }),
);

function openHost(host: Host) {
  void router.push({ name: "asset-detail", params: { id: host.objectId } });
}
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">主機列表</h1>
      <p class="text-muted-foreground text-xs">全部用戶端・{{ rows.length }} 台</p>
    </div>

    <Card>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="rows"
          :row-key="(host: Host) => host.objectId"
          :search="
            (host: Host) =>
              [host.hostName, host.orgName, host.ipAddress.join(' '), host.osName, host.owner].join(
                ' ',
              )
          "
          v-model:sort="sortKey"
          v-model:desc="sortDesc"
          search-placeholder="搜尋電腦名稱／單位／IP⋯⋯"
          selectable
          :page-size="12"
          @row-click="openHost"
        >
          <template #toolbar="{ selectedCount, clearSelection }">
            <Button
              variant="outline"
              size="sm"
              :class="isOn({ status: 'offline' }) ? 'bg-accent' : ''"
              @click="toggle({ status: 'offline' })"
            >
              只看離線
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="isOn({ compliance: 'low' }) ? 'bg-accent' : ''"
              @click="toggle({ compliance: 'low' })"
            >
              合規未達標
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="isOn({ risk: 'high' }) ? 'bg-accent' : ''"
              @click="toggle({ risk: 'high' })"
            >
              高風險
            </Button>
            <Button variant="outline" size="sm" :disabled="!selectedCount">
              批次封存 ({{ selectedCount }})
            </Button>
            <Button variant="ghost" size="sm" :disabled="!selectedCount" @click="clearSelection">
              取消勾選
            </Button>
          </template>

          <template #filters>
            <div v-if="chips.length" class="flex flex-wrap items-center gap-1.5">
              <span class="text-muted-foreground text-xs">篩選條件</span>
              <button
                v-for="chip in chips"
                :key="chip.key"
                type="button"
                class="bg-accent hover:bg-accent/70 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                @click="clearChip(chip.key)"
              >
                {{ chip.label }}
                <XIcon class="size-3" />
              </button>
              <Button variant="ghost" size="xs" @click="setFilters({})">清除全部</Button>
            </div>
          </template>

          <template #cell-hostName="{ row }">
            <RouterLink
              :to="{ name: 'asset-detail', params: { id: row.objectId } }"
              class="font-medium underline-offset-4 hover:underline"
              @click.stop
            >
              {{ row.hostName }}
            </RouterLink>
            <p class="text-muted-foreground text-xs">{{ policyName(row.policyId) }}</p>
          </template>

          <template #cell-gcbComplianceRate="{ row }">
            <ComplianceBar :rate="row.gcbComplianceRate" />
          </template>

          <template #cell-cvssScore="{ row }">
            <span :class="row.cvssScore >= 9 ? 'text-destructive font-medium' : ''">
              {{ row.cvssScore.toFixed(1) }}
            </span>
          </template>

          <template #cell-status="{ row }">
            <Badge :variant="row.status === 'online' ? 'secondary' : 'outline'">
              {{ row.status === "online" ? "上線" : "離線" }}
            </Badge>
          </template>

          <template #cell-lastSeen="{ row }">
            <span class="text-muted-foreground">{{ relativeTime(row.lastSeen) }}</span>
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
