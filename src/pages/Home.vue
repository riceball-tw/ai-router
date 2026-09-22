<script setup lang="ts">
import heroImg from "../assets/hero.png";
import typescriptLogo from "../assets/typescript.svg";
import viteLogo from "../assets/vite.svg";
</script>

<template>
  <section id="center">
    <div class="hero">
      <img :src="heroImg" class="base" width="170" height="179" />
      <img :src="typescriptLogo" class="framework" alt="TypeScript logo" />
      <img :src="viteLogo" class="vite" alt="Vite logo" />
    </div>
    <div>
      <h1>Get started</h1>
      <p>Edit <code>src/pages/Home.vue</code> and save to test <code>HMR</code></p>
    </div>
    <RouterLink to="/counter" class="counter">Try the counter demo</RouterLink>
  </section>

  <div class="ticks"></div>

  <section id="next-steps">
    <div id="docs">
      <svg class="icon" role="presentation" aria-hidden="true">
        <use href="/icons.svg#documentation-icon"></use>
      </svg>
      <h2>Documentation</h2>
      <p>Your questions, answered</p>
      <ul>
        <li>
          <a href="https://vuejs.org/" target="_blank">
            <img class="button-icon" :src="typescriptLogo" alt="" />
            Explore Vue
          </a>
        </li>
        <li>
          <a href="https://router.vuejs.org/" target="_blank">
            <img class="button-icon" :src="viteLogo" alt="" />
            Explore Vue Router
          </a>
        </li>
      </ul>
    </div>
    <div id="social">
      <svg class="icon" role="presentation" aria-hidden="true">
        <use href="/icons.svg#social-icon"></use>
      </svg>
      <h2>Connect with us</h2>
      <p>Join the Vite community</p>
      <ul>
        <li>
          <a href="https://github.com/vitejs/vite" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#github-icon"></use>
            </svg>
            GitHub
          </a>
        </li>
        <li>
          <a href="https://chat.vite.dev/" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#discord-icon"></use>
            </svg>
            Discord
          </a>
        </li>
      </ul>
    </div>
  </section>

  <div class="ticks"></div>
  <section id="spacer"></section>
</template>
