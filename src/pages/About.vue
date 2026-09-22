<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <section id="center">
    <h1>About</h1>
    <p>Vue 3 + Vue Router demo page.</p>
    <code>route.name = {{ String(route.name) }}</code>
  </section>
</template>
