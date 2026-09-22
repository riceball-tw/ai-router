<script setup lang="ts">
import { products } from "../data/demo";
</script>

<template>
  <section class="page">
    <h1>Products</h1>
    <div class="cards">
      <article v-for="product in products" :key="product.id" class="card">
        <h2>{{ product.name }}</h2>
        <p class="status">{{ product.category }} · ${{ product.price }}</p>
        <p>{{ product.blurb }}</p>
      </article>
    </div>
  </section>
</template>
