import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: () => import("@/pages/Home.vue") },
    { path: "/orders", name: "orders", component: () => import("@/pages/Orders.vue") },
    {
      path: "/orders/:id",
      name: "order-detail",
      component: () => import("@/pages/OrderDetail.vue"),
    },
    { path: "/products", name: "products", component: () => import("@/pages/Products.vue") },
    { path: "/cart", name: "cart", component: () => import("@/pages/Cart.vue") },
    { path: "/settings", name: "settings", component: () => import("@/pages/Settings.vue") },
    { path: "/help", name: "help", component: () => import("@/pages/Help.vue") },
  ],
});

export default router;
