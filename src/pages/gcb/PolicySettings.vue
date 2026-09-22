<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gcbItemsForHost, gcbPolicies, hostsByPolicy } from "@/data/console";
import { computed, ref } from "vue";

const activeId = ref(gcbPolicies[0]!.id);
const active = computed(() => gcbPolicies.find((policy) => policy.id === activeId.value)!);
/** Item list is per-host in the real product; the demo previews it with a sample host. */
const sampleHost = computed(() => hostsByPolicy(activeId.value)[0]);
const items = computed(() => (sampleHost.value ? gcbItemsForHost(sampleHost.value) : []));
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">組態設定</h1>
      <Button variant="outline" size="sm" class="ml-auto" disabled>匯入基準（demo）</Button>
    </div>

    <div class="grid gap-3 lg:grid-cols-[260px_1fr]">
      <Card>
        <CardHeader><CardTitle class="text-sm">基準清單</CardTitle></CardHeader>
        <CardContent class="space-y-1">
          <button
            v-for="policy in gcbPolicies"
            :key="policy.id"
            type="button"
            class="hover:bg-accent w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors"
            :class="policy.id === activeId ? 'bg-accent font-medium' : 'text-muted-foreground'"
            @click="activeId = policy.id"
          >
            {{ policy.name }}
            <span class="block text-xs opacity-70">
              {{ policy.version }}・{{ hostsByPolicy(policy.id).length }} 台
            </span>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex flex-wrap items-center gap-2 text-sm">
            {{ active.name }}
            <Badge variant="outline">{{ active.version }}</Badge>
            <span class="text-muted-foreground font-normal">
              共 {{ active.itemCount }} 項・最後更新 {{ active.updatedAt }}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground mb-2 text-xs">
            以 {{ sampleHost?.hostName ?? "—" }} 的最近一次掃描結果預覽項目狀態
          </p>
          <ul class="divide-y text-sm">
            <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-1.5">
              <span class="text-muted-foreground w-24 shrink-0 truncate text-xs">{{
                item.id
              }}</span>
              <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
              <Badge variant="outline">{{ item.level }}</Badge>
              <span
                class="w-16 text-right text-xs"
                :class="item.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'"
              >
                {{ item.passed ? "合規" : "不合規" }}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
