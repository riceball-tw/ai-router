<script setup lang="ts">
import { ref } from "vue";

const count = ref(0);
</script>

<template>
  <section id="center">
    <h1>Counter</h1>
    <button type="button" class="counter" @click="count++">Count is {{ count }}</button>
    <p>Vue reactivity demo — state lives in this component only.</p>
  </section>
</template>
