<script setup lang="ts">
import DataTable from "@/components/console/DataTable.vue";
import type { Column } from "@/components/console/data-table";
import SeverityBadge from "@/components/console/SeverityBadge.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PATCH_STATUS_LABEL,
  SEVERITY_LABEL,
  hostById,
  vulnerabilities,
  vulnerabilityById,
  type Severity,
  type Vulnerability,
} from "@/data/console";
import { parseSortQuery } from "@/lib/sort-query";
import { parseTimeRange, TIME_RANGE_LABEL, withinRange } from "@/lib/time-range";
import { VANS_SORTABLE } from "@/pages/vans/vans-filters";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/**
 * Both filters come from the URL, so the intent chat can land on a filtered view
 * (`/vans?severity=critical`) exactly like a user clicking the filter would.
 */
const severity = computed(() => {
  const value = route.query.severity;
  return typeof value === "string" && value in SEVERITY_LABEL ? (value as Severity) : null;
});

const focused = computed(() =>
  typeof route.query.cve === "string" ? vulnerabilityById(route.query.cve) : undefined,
);

/** `?since=week` narrows by 公告日期 — the same param the 操作紀錄 page uses. */
const range = computed(() => parseTimeRange(route.query));

const rows = computed(() =>
  vulnerabilities
    .filter((vuln) => (severity.value ? vuln.severity === severity.value : true))
    .filter((vuln) => withinRange(`${vuln.publishedAt}T00:00:00+08:00`, range.value)),
);

const focusedHosts = computed(() =>
  (focused.value?.affectedHostIds ?? []).map(hostById).filter((host) => host !== undefined),
);

const columns: Column<Vulnerability>[] = [
  { key: "cveId", title: "CVE 編號", sortable: true, value: (row) => row.cveId },
  { key: "title", title: "弱點名稱", value: (row) => row.title },
  { key: "software", title: "影響軟體", sortable: true, value: (row) => row.software },
  { key: "severity", title: "風險等級", sortable: true, value: (row) => row.cvss },
  { key: "cvss", title: "CVSS", sortable: true, align: "end", value: (row) => row.cvss },
  {
    key: "affected",
    title: "受影響主機",
    sortable: true,
    align: "end",
    value: (row) => row.affectedHostIds.length,
  },
  { key: "patchStatus", title: "修補狀態", sortable: true, value: (row) => row.patchStatus },
  { key: "publishedAt", title: "公告日期", sortable: true, value: (row) => row.publishedAt },
];

/** Sort is URL state here too, so `?sort=cvss&dir=desc` is a link anyone can send. */
const sortState = computed(() => parseSortQuery(route.query, VANS_SORTABLE));

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
  void router.replace({ path: "/vans", query });
}

function setSeverity(value: Severity | null) {
  writeQuery({ severity: value ?? undefined, cve: undefined });
}

function focus(vuln: Vulnerability) {
  void router.replace({ path: "/vans", query: { ...route.query, cve: vuln.cveId } });
}
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">風險管理</h1>
      <p class="text-muted-foreground text-xs">弱點通報與受影響資產・共 {{ rows.length }} 筆</p>
      <span v-if="range !== 'none'" class="bg-accent rounded-full px-2 py-0.5 text-xs">
        {{ TIME_RANGE_LABEL[range] }}
      </span>
    </div>

    <Card>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="rows"
          :row-key="(row: Vulnerability) => row.cveId"
          :search="(row: Vulnerability) => `${row.cveId} ${row.title} ${row.software}`"
          v-model:sort="sortKey"
          v-model:desc="sortDesc"
          search-placeholder="搜尋 CVE／軟體⋯⋯"
          :page-size="10"
          @row-click="focus"
        >
          <template #toolbar>
            <Button
              variant="outline"
              size="sm"
              :class="!severity ? 'bg-accent' : ''"
              @click="setSeverity(null)"
            >
              全部
            </Button>
            <Button
              v-for="(label, key) in SEVERITY_LABEL"
              :key="key"
              variant="outline"
              size="sm"
              :class="severity === key ? 'bg-accent' : ''"
              @click="setSeverity(key)"
            >
              {{ label }}
            </Button>
          </template>

          <template #cell-cveId="{ row }">
            <button type="button" class="font-medium underline-offset-4 hover:underline">
              {{ row.cveId }}
            </button>
          </template>
          <template #cell-severity="{ row }">
            <SeverityBadge :severity="row.severity" />
          </template>
          <template #cell-cvss="{ row }">{{ row.cvss.toFixed(1) }}</template>
          <template #cell-affected="{ row }">{{ row.affectedHostIds.length }}</template>
          <template #cell-patchStatus="{ row }">
            <Badge :variant="row.patchStatus === 'unpatched' ? 'destructive' : 'outline'">
              {{ PATCH_STATUS_LABEL[row.patchStatus] }}
            </Badge>
          </template>
        </DataTable>
      </CardContent>
    </Card>

    <Card v-if="focused">
      <CardHeader>
        <CardTitle class="flex flex-wrap items-center gap-2 text-sm">
          {{ focused.cveId }}
          <SeverityBadge :severity="focused.severity" />
          <span class="text-muted-foreground font-normal">{{ focused.title }}</span>
          <Button
            variant="ghost"
            size="xs"
            class="ml-auto"
            @click="router.replace({ path: '/vans', query: { severity: route.query.severity } })"
          >
            收合
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <dl class="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-4">
          <dt class="text-muted-foreground">CVSS</dt>
          <dd class="tabular-nums">{{ focused.cvss.toFixed(1) }}</dd>
          <dt class="text-muted-foreground">修補狀態</dt>
          <dd>{{ PATCH_STATUS_LABEL[focused.patchStatus] }}</dd>
          <dt class="text-muted-foreground">影響軟體</dt>
          <dd>{{ focused.software }}</dd>
          <dt class="text-muted-foreground">公告日期</dt>
          <dd>{{ focused.publishedAt }}</dd>
        </dl>
        <div>
          <p class="text-muted-foreground mb-1.5 text-xs">
            受影響主機（{{ focusedHosts.length }} 台，最多列出 12 台）
          </p>
          <ul class="flex flex-wrap gap-1.5">
            <li v-for="host in focusedHosts.slice(0, 12)" :key="host.objectId">
              <RouterLink
                :to="{ name: 'asset-detail', params: { id: host.objectId } }"
                class="hover:bg-accent inline-flex rounded-md border px-2 py-1 text-xs"
              >
                {{ host.hostName }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
