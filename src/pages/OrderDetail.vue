<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { orders } from "@/data/demo";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const order = computed(() => orders.find((candidate) => candidate.id === route.params.id));
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-4 p-8">
    <template v-if="order">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-semibold tracking-tight">{{ order.id }}</h1>
        <Badge variant="secondary">{{ order.status }}</Badge>
      </div>
      <p class="text-muted-foreground text-sm">Placed {{ order.placedAt }} · ${{ order.total }}</p>
      <ul class="text-muted-foreground list-disc space-y-1 pl-5">
        <li v-for="item in order.items" :key="item">{{ item }}</li>
      </ul>
    </template>
    <template v-else>
      <h1 class="text-3xl font-semibold tracking-tight">Order not found</h1>
      <RouterLink to="/orders" class="text-sm underline underline-offset-4">
        Back to orders
      </RouterLink>
    </template>
  </section>
</template>
