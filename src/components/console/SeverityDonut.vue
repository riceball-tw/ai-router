<script setup lang="ts">
import { SEVERITY_LABEL, type Severity } from "@/data/console";
import { computed } from "vue";

const props = defineProps<{ data: { severity: Severity; count: number }[] }>();

/**
 * Status colors, not a categorical palette: severity is a reserved state scale,
 * and every slice is also named in the legend, so identity is never color-alone.
 */
const STROKE: Record<Severity, string> = {
  critical: "var(--color-destructive)",
  high: "var(--color-orange-500)",
  medium: "var(--color-amber-500)",
  low: "var(--color-muted-foreground)",
};

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 2px surface gap between neighbouring segments. */
const GAP = 2;

const total = computed(() => props.data.reduce((sum, slice) => sum + slice.count, 0));

const segments = computed(() => {
  let offset = 0;
  return props.data.map((slice) => {
    const share = total.value ? slice.count / total.value : 0;
    const length = Math.max(0, share * CIRCUMFERENCE - GAP);
    const segment = {
      ...slice,
      share,
      stroke: STROKE[slice.severity],
      dash: `${length} ${CIRCUMFERENCE - length}`,
      offset: -offset,
    };
    offset += share * CIRCUMFERENCE;
    return segment;
  });
});
</script>

<template>
  <div class="flex items-center gap-6">
    <svg
      viewBox="0 0 120 120"
      class="size-32 shrink-0 -rotate-90"
      role="img"
      aria-label="弱點風險分布"
    >
      <circle
        cx="60"
        cy="60"
        :r="RADIUS"
        fill="none"
        stroke="var(--color-muted)"
        stroke-width="12"
      />
      <circle
        v-for="segment in segments"
        :key="segment.severity"
        cx="60"
        cy="60"
        :r="RADIUS"
        fill="none"
        :stroke="segment.stroke"
        stroke-width="12"
        :stroke-dasharray="segment.dash"
        :stroke-dashoffset="segment.offset"
      >
        <title>{{ SEVERITY_LABEL[segment.severity] }}：{{ segment.count }} 台</title>
      </circle>
    </svg>

    <dl class="min-w-0 flex-1 space-y-1.5 text-sm">
      <div v-for="segment in segments" :key="segment.severity" class="flex items-center gap-2">
        <span class="size-2 shrink-0 rounded-full" :style="{ background: segment.stroke }" />
        <dt class="text-muted-foreground">{{ SEVERITY_LABEL[segment.severity] }}</dt>
        <dd class="ml-auto tabular-nums">
          {{ segment.count }}
          <span class="text-muted-foreground text-xs">
            ({{ Math.round(segment.share * 100) }}%)
          </span>
        </dd>
      </div>
    </dl>
  </div>
</template>
