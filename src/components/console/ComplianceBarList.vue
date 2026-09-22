<script setup lang="ts">
/** One measure, one series: no legend, every bar directly labelled. */
defineProps<{ data: { orgName: string; rate: number; hostCount: number }[] }>();

function tone(rate: number): string {
  return rate < 70 ? "bg-destructive" : rate < 85 ? "bg-amber-500" : "bg-emerald-500";
}
</script>

<template>
  <ul class="space-y-2.5">
    <li
      v-for="row in data"
      :key="row.orgName"
      class="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-3"
    >
      <span
        class="text-muted-foreground truncate text-sm"
        :title="`${row.orgName}・${row.hostCount} 台`"
      >
        {{ row.orgName }}
      </span>
      <span class="bg-muted h-2 overflow-hidden rounded-full">
        <span
          class="block h-full rounded-full"
          :class="tone(row.rate)"
          :style="{ width: `${row.rate}%` }"
        />
      </span>
      <span class="text-right text-sm tabular-nums">{{ row.rate }}%</span>
    </li>
  </ul>
</template>
