<script setup lang="ts">
import SeverityBadge from "@/components/console/SeverityBadge.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerActions } from "@/ai/actions";
import { PATCH_STATUS_LABEL, vulnerabilities, type PatchStatus } from "@/data/console";
import { createDispatch, dispatches } from "@/data/console-state";
import { computed, onScopeDispose } from "vue";

const COLUMNS: PatchStatus[] = ["unpatched", "patching", "patched", "accepted"];

const outstanding = computed(() =>
  vulnerabilities.filter((vuln) => vuln.patchStatus === "unpatched"),
);

/** Creating a dispatch changes data, so the chat confirms before calling `run`. */
onScopeDispose(
  registerActions({
    create_dispatch: {
      describe: () =>
        `要為 ${outstanding.value.length} 個未修補弱點建立派送嗎？` +
        `（影響 ${new Set(outstanding.value.flatMap((vuln) => vuln.affectedHostIds)).size} 台主機）`,
      run: () =>
        createDispatch(
          outstanding.value.map((vuln) => vuln.cveId),
          new Set(outstanding.value.flatMap((vuln) => vuln.affectedHostIds)).size,
        ),
    },
  }),
);

const board = computed(() =>
  COLUMNS.map((status) => ({
    status,
    items: vulnerabilities
      .filter((vuln) => vuln.patchStatus === status)
      .sort((a, b) => b.cvss - a.cvss),
  })),
);
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">修補計畫</h1>
      <p class="text-muted-foreground text-xs">派送批次以修補狀態分欄，示範用假資料</p>
      <Button
        variant="outline"
        size="sm"
        class="ml-auto"
        @click="
          createDispatch(
            outstanding.map((vuln) => vuln.cveId),
            new Set(outstanding.flatMap((vuln) => vuln.affectedHostIds)).size,
          )
        "
      >
        建立派送（{{ outstanding.length }}）
      </Button>
    </div>

    <Card v-if="dispatches.length">
      <CardHeader><CardTitle class="text-sm">派送批次</CardTitle></CardHeader>
      <CardContent>
        <ul class="divide-y text-sm">
          <li v-for="job in dispatches" :key="job.id" class="flex items-center gap-3 py-1.5">
            <span class="font-medium">{{ job.id }}</span>
            <span class="text-muted-foreground min-w-0 flex-1 truncate">
              {{ job.cveIds.join("、") }}
            </span>
            <span class="tabular-nums">{{ job.hostCount }} 台</span>
          </li>
        </ul>
      </CardContent>
    </Card>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card v-for="column in board" :key="column.status" class="gap-2">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-sm">
            {{ PATCH_STATUS_LABEL[column.status] }}
            <span class="text-muted-foreground font-normal">{{ column.items.length }}</span>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <p v-if="!column.items.length" class="text-muted-foreground py-4 text-center text-xs">
            無項目
          </p>
          <article
            v-for="vuln in column.items"
            :key="vuln.cveId"
            class="space-y-1 rounded-lg border p-2.5"
          >
            <div class="flex items-center gap-2">
              <RouterLink
                :to="{ path: '/vans', query: { cve: vuln.cveId } }"
                class="text-sm font-medium underline-offset-4 hover:underline"
              >
                {{ vuln.cveId }}
              </RouterLink>
              <SeverityBadge class="ml-auto" :severity="vuln.severity" />
            </div>
            <p class="text-muted-foreground truncate text-xs">{{ vuln.title }}</p>
            <p class="text-muted-foreground text-xs">
              {{ vuln.affectedHostIds.length }} 台待處理・CVSS {{ vuln.cvss.toFixed(1) }}
            </p>
          </article>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
