<script setup lang="ts">
import DataTable from "@/components/console/DataTable.vue";
import type { Column } from "@/components/console/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { registerActions } from "@/ai/actions";
import { actionLogs, formatDateTime, type ActionLog } from "@/data/console";
import { downloadCsv } from "@/data/console-state";
import { parseTimeRange, TIME_RANGE_LABEL, withinRange } from "@/lib/time-range";
import { computed, onScopeDispose, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const onlyFailed = ref(false);
/** `?since=week` — set by a chat message or by the buttons below, same param. */
const range = computed(() => parseTimeRange(route.query));

const rows = computed(() =>
  actionLogs
    .filter((log) => withinRange(log.at, range.value))
    .filter((log) => (onlyFailed.value ? log.result === "failed" : true)),
);

onScopeDispose(
  registerActions({
    export_csv: {
      describe: () => `匯出 ${rows.value.length} 筆紀錄`,
      run: () =>
        downloadCsv(
          "action-logs.csv",
          ["時間", "帳號", "操作", "對象", "來源 IP", "結果"],
          rows.value.map((log) => [
            formatDateTime(log.at),
            log.account,
            log.action,
            log.target,
            log.ip,
            log.result,
          ]),
        ),
    },
  }),
);

const columns: Column<ActionLog>[] = [
  { key: "at", title: "時間", sortable: true, value: (row) => row.at },
  { key: "account", title: "帳號", sortable: true, value: (row) => row.account },
  { key: "action", title: "操作", sortable: true, value: (row) => row.action },
  { key: "target", title: "對象", value: (row) => row.target },
  { key: "ip", title: "來源 IP", value: (row) => row.ip },
  { key: "result", title: "結果", sortable: true, value: (row) => row.result },
];

function exportCsv() {
  downloadCsv(
    "action-logs.csv",
    ["時間", "帳號", "操作", "對象", "來源 IP", "結果"],
    rows.value.map((log) => [
      formatDateTime(log.at),
      log.account,
      log.action,
      log.target,
      log.ip,
      log.result,
    ]),
  );
}
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">操作紀錄</h1>
      <span v-if="range !== 'none'" class="bg-accent rounded-full px-2 py-0.5 text-xs">
        {{ TIME_RANGE_LABEL[range] }}
      </span>
    </div>

    <Card>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="rows"
          :row-key="(row: ActionLog) => row.id"
          :search="(row: ActionLog) => `${row.account} ${row.action} ${row.target} ${row.ip}`"
          search-placeholder="搜尋帳號／操作／對象⋯⋯"
          :page-size="12"
        >
          <template #toolbar>
            <Button variant="outline" size="sm" @click="onlyFailed = !onlyFailed">
              {{ onlyFailed ? "顯示全部" : "只看失敗" }}
            </Button>
            <Button variant="outline" size="sm" @click="exportCsv">匯出 CSV</Button>
          </template>
          <template #cell-at="{ row }">{{ formatDateTime(row.at) }}</template>
          <template #cell-result="{ row }">
            <Badge :variant="row.result === 'success' ? 'secondary' : 'destructive'">
              {{ row.result === "success" ? "成功" : "失敗" }}
            </Badge>
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
