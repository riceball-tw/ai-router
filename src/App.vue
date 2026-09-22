<script setup lang="ts">
import IntentChat from "@/components/IntentChat.vue";

const links = [
  { to: "/", label: "Home" },
  { to: "/orders", label: "Orders" },
  { to: "/products", label: "Products" },
  { to: "/cart", label: "Cart" },
  { to: "/settings", label: "Settings" },
  { to: "/help", label: "Help" },
];
</script>

<template>
  <div class="grid min-h-svh grid-cols-1 lg:grid-cols-[1fr_380px]">
    <main class="min-w-0">
      <nav class="flex flex-wrap justify-center gap-1 border-b p-3">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="text-muted-foreground hover:bg-accent hover:text-accent-foreground [&.router-link-exact-active]:bg-accent [&.router-link-exact-active]:text-accent-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
      <RouterView />
    </main>
    <IntentChat />
  </div>
</template>
