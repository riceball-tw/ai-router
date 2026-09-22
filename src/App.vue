<script setup lang="ts"></script>

<template>
  <nav id="nav">
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/counter">Counter</RouterLink>
    <RouterLink to="/about">About</RouterLink>
  </nav>
  <RouterView />
</template>
