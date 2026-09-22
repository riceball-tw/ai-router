<script setup lang="ts">
import { cart, products } from "@/data/demo";
import { computed } from "vue";

const lines = computed(() =>
  cart.map((line) => ({
    ...line,
    product: products.find((product) => product.id === line.productId)!,
  })),
);
const total = computed(() =>
  lines.value.reduce((sum, line) => sum + line.product.price * line.qty, 0),
);
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-4 p-8">
    <h1 class="text-3xl font-semibold tracking-tight">Cart</h1>
    <ul class="divide-y text-sm">
      <li v-for="line in lines" :key="line.productId" class="flex justify-between py-2">
        <span>{{ line.qty }} × {{ line.product.name }}</span>
        <span class="tabular-nums">${{ line.product.price * line.qty }}</span>
      </li>
    </ul>
    <p class="text-sm font-medium">Total ${{ total }}</p>
  </section>
</template>
