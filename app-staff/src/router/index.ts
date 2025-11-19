import { createRouter, createWebHistory } from 'vue-router';
import { authApi } from '../lib/api';

const Dashboard = () => import('../pages/Dashboard.vue');
const Orders = () => import('../pages/Orders.vue');
const Menu = () => import('../pages/Menu.vue');
const Cashier = () => import('../pages/Cashier.vue');
const Users = () => import('../pages/Users.vue');
const Login = () => import('../pages/Login.vue');
const AuthPerm = () => import('../pages/auth/AuthPerm.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/orders', name: 'orders', component: Orders },
    { path: '/cashier', name: 'cashier', component: Cashier },
    { path: '/menu', name: 'menu', component: Menu },
    { path: '/users', name: 'users', component: Users },
    { path: '/login', name: 'login', component: Login },
    // Route to land from QR/permanent token
    { path: '/auth/perm', name: 'auth-perm', component: AuthPerm },
  ],
});

router.beforeEach(async (to) => {
  // Allow the QR/permanent token landing route unconditionally to set the cookie
  if (to.name === 'auth-perm') return true;

  // Always fetch fresh status to reflect newly created admin or QR logins
  let st: { adminExists: boolean; hasUser: boolean } = { adminExists: true, hasUser: false };
  try {
    // Force bypassing the 60s cache to immediately reflect new sessions (e.g., token login)
    const s = await authApi.status({ force: true });
    st = { adminExists: s.adminExists, hasUser: !!s.currentUser };
  } catch {
    // leave defaults; App.vue mock banner will guide user
  }
  if (!st?.adminExists) {
    // First-time setup: show root which renders the setup screen
    if (to.path !== '/') return { path: '/' };
    return true;
  }
  // If admin exists but no active session → only allow /login (or /auth/perm handled above)
  if (st && !st.hasUser) {
    if (to.name !== 'login') return { path: '/login', query: to.query, hash: to.hash };
    return true;
  }
  // If already logged in and going to login → redirect home
  if (st?.hasUser && to.name === 'login') return { path: '/' };
  return true;
});

export default router;
