import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('../pages/Menu.vue') },
  { path: '/checkout', component: () => import('../pages/Checkout.vue') },
  { path: '/success/:id', component: () => import('../pages/Success.vue'), props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
