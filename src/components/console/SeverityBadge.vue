<script setup lang="ts">
import { SEVERITY_LABEL, type Severity } from "@/data/console";

defineProps<{ severity: Severity }>();

const CLASSES: Record<Severity, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};
</script>

<template>
  <span
    class="inline-flex h-5 items-center rounded-full px-2 text-xs font-medium"
    :class="CLASSES[severity]"
  >
    {{ SEVERITY_LABEL[severity] }}
  </span>
</template>
