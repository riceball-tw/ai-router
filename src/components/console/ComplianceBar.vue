<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ rate: number; width?: string }>();

/** The console's own thresholds: under 70 is a finding, under 85 needs work. */
const tone = computed(() =>
  props.rate < 70 ? "bg-destructive" : props.rate < 85 ? "bg-amber-500" : "bg-emerald-500",
);
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <span class="bg-muted h-1.5 overflow-hidden rounded-full" :class="width ?? 'w-20'">
      <span class="block h-full" :class="tone" :style="{ width: `${rate}%` }" />
    </span>
    <span class="text-xs tabular-nums">{{ rate }}%</span>
  </span>
</template>
