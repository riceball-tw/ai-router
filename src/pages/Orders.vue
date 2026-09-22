<script setup lang="ts">
import { orders } from "../data/demo";
</script>

<template>
  <section class="page">
    <h1>Orders</h1>
    <table class="data">
      <thead>
        <tr>
          <th>Order</th>
          <th>Placed</th>
          <th>Status</th>
          <th>Items</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>
            <RouterLink :to="{ name: 'order-detail', params: { id: order.id } }">{{
              order.id
            }}</RouterLink>
          </td>
          <td>{{ order.placedAt }}</td>
          <td>{{ order.status }}</td>
          <td>{{ order.items.join(", ") }}</td>
          <td>${{ order.total }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
