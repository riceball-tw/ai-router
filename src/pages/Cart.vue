<script setup lang="ts">
import { computed } from "vue";
import { cart, products } from "../data/demo";

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
  <section class="page">
    <h1>Cart</h1>
    <ul>
      <li v-for="line in lines" :key="line.productId">
        {{ line.qty }} × {{ line.product.name }} — ${{ line.product.price * line.qty }}
      </li>
    </ul>
    <p class="status">Total ${{ total }}</p>
  </section>
</template>
