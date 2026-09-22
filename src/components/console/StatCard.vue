<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";
import type { Component } from "vue";

defineProps<{
  label: string;
  value: string | number;
  hint?: string;
  icon?: Component;
  tone?: "default" | "warning" | "danger";
}>();
</script>

<template>
  <Card class="gap-0 py-4">
    <CardContent class="flex items-start gap-3 px-4">
      <span
        class="rounded-lg p-2"
        :class="{
          'bg-muted text-muted-foreground': !tone || tone === 'default',
          'bg-amber-500/10 text-amber-600 dark:text-amber-400': tone === 'warning',
          'bg-destructive/10 text-destructive': tone === 'danger',
        }"
      >
        <component :is="icon" v-if="icon" class="size-4" />
      </span>
      <div class="min-w-0 space-y-0.5">
        <p class="text-muted-foreground text-xs">{{ label }}</p>
        <p class="text-2xl font-semibold tabular-nums">{{ value }}</p>
        <p v-if="hint" class="text-muted-foreground truncate text-xs">{{ hint }}</p>
      </div>
    </CardContent>
  </Card>
</template>
