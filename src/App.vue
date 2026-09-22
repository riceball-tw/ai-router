<script setup lang="ts">
import IntentChat from "./components/IntentChat.vue";
</script>

<template>
  <div class="shell">
    <main>
      <nav id="nav">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/orders">Orders</RouterLink>
        <RouterLink to="/products">Products</RouterLink>
        <RouterLink to="/cart">Cart</RouterLink>
        <RouterLink to="/settings">Settings</RouterLink>
        <RouterLink to="/help">Help</RouterLink>
      </nav>
      <RouterView />
    </main>
    <IntentChat />
  </div>
</template>
