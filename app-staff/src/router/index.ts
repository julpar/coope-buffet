import { createRouter, createWebHistory } from 'vue-router';

const Dashboard = () => import('../pages/Dashboard.vue');
const Orders = () => import('../pages/Orders.vue');
const Inventory = () => import('../pages/Inventory.vue');
const Menu = () => import('../pages/Menu.vue');
const Users = () => import('../pages/Users.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/orders', name: 'orders', component: Orders },
    { path: '/inventory', name: 'inventory', component: Inventory },
    { path: '/menu', name: 'menu', component: Menu },
    { path: '/users', name: 'users', component: Users },
  ],
});

export default router;
