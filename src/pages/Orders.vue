<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { orders } from "@/data/demo";
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-4 p-8">
    <h1 class="text-3xl font-semibold tracking-tight">Orders</h1>
    <table class="w-full text-sm">
      <thead>
        <tr class="text-muted-foreground border-b text-left">
          <th class="px-3 py-2 font-medium">Order</th>
          <th class="px-3 py-2 font-medium">Placed</th>
          <th class="px-3 py-2 font-medium">Status</th>
          <th class="px-3 py-2 font-medium">Items</th>
          <th class="px-3 py-2 font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id" class="border-b last:border-0">
          <td class="px-3 py-2">
            <RouterLink
              :to="{ name: 'order-detail', params: { id: order.id } }"
              class="font-medium underline-offset-4 hover:underline"
            >
              {{ order.id }}
            </RouterLink>
          </td>
          <td class="text-muted-foreground px-3 py-2">{{ order.placedAt }}</td>
          <td class="px-3 py-2">
            <Badge variant="secondary">{{ order.status }}</Badge>
          </td>
          <td class="text-muted-foreground px-3 py-2">{{ order.items.join(", ") }}</td>
          <td class="px-3 py-2 tabular-nums">${{ order.total }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
