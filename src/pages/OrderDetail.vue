<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { orders } from "../data/demo";

const route = useRoute();
const order = computed(() => orders.find((candidate) => candidate.id === route.params.id));
</script>

<template>
  <section class="page">
    <template v-if="order">
      <h1>{{ order.id }}</h1>
      <p class="status">{{ order.status }} · placed {{ order.placedAt }} · ${{ order.total }}</p>
      <ul>
        <li v-for="item in order.items" :key="item">{{ item }}</li>
      </ul>
    </template>
    <template v-else>
      <h1>Order not found</h1>
      <RouterLink to="/orders">Back to orders</RouterLink>
    </template>
  </section>
</template>
