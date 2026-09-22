<script setup lang="ts">
import DataTable from "@/components/console/DataTable.vue";
import type { Column } from "@/components/console/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { consoleUsers, relativeTime, type ConsoleUser } from "@/data/console";

const columns: Column<ConsoleUser>[] = [
  { key: "account", title: "帳號", sortable: true, value: (row) => row.account },
  { key: "name", title: "姓名", sortable: true, value: (row) => row.name },
  { key: "role", title: "角色", sortable: true, value: (row) => row.role },
  { key: "orgName", title: "所屬單位", sortable: true, value: (row) => row.orgName },
  { key: "lastLogin", title: "最後登入", sortable: true, value: (row) => row.lastLogin },
  { key: "status", title: "狀態", sortable: true, value: (row) => row.status },
];
</script>

<template>
  <section class="space-y-4 p-4">
    <h1 class="text-xl font-semibold">使用者管理</h1>

    <Card>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="consoleUsers"
          :row-key="(row: ConsoleUser) => row.account"
          :search="(row: ConsoleUser) => `${row.account} ${row.name} ${row.role} ${row.orgName}`"
          search-placeholder="搜尋帳號／姓名⋯⋯"
          selectable
          :page-size="10"
        >
          <template #toolbar="{ selectedCount }">
            <Button variant="outline" size="sm" disabled>新增使用者（demo）</Button>
            <Button variant="outline" size="sm" :disabled="!selectedCount">
              停用 ({{ selectedCount }})
            </Button>
          </template>
          <template #cell-role="{ row }">
            <Badge variant="outline">{{ row.role }}</Badge>
          </template>
          <template #cell-lastLogin="{ row }">
            <span class="text-muted-foreground">{{ relativeTime(row.lastLogin) }}</span>
          </template>
          <template #cell-status="{ row }">
            <Badge :variant="row.status === '啟用' ? 'secondary' : 'outline'">{{
              row.status
            }}</Badge>
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
