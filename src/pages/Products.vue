<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { products } from "@/data/demo";
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-4 p-8">
    <h1 class="text-3xl font-semibold tracking-tight">Products</h1>
    <div class="grid gap-3 sm:grid-cols-2">
      <Card v-for="product in products" :key="product.id">
        <CardHeader>
          <CardTitle class="text-base">{{ product.name }}</CardTitle>
          <p class="text-muted-foreground text-sm">{{ product.category }} · ${{ product.price }}</p>
        </CardHeader>
        <CardContent class="text-muted-foreground text-sm">{{ product.blurb }}</CardContent>
      </Card>
    </div>
  </section>
</template>
