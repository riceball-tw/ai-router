import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../pages/Home.vue"),
    },
    {
      path: "/counter",
      name: "counter",
      component: () => import("../pages/Counter.vue"),
    },
    {
      path: "/about",
      name: "about",
      component: () => import("../pages/About.vue"),
    },
  ],
});

export default router;
