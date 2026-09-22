<script setup lang="ts">
import IntentChat from "@/components/IntentChat.vue";
import ConsoleLayout from "@/layouts/ConsoleLayout.vue";
</script>

<template>
  <div class="grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
    <ConsoleLayout class="min-w-0" />
    <IntentChat class="min-w-0" />
  </div>
</template>
