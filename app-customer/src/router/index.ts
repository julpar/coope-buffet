import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { platform } from '../lib/platform';

const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('../pages/Menu.vue') },
  { path: '/checkout', component: () => import('../pages/Checkout.vue') },
  { path: '/success/:id', component: () => import('../pages/Success.vue'), props: true },
  { path: '/return-mp', component: () => import('../pages/ReturnMp.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Guard: prevent entering checkout when platform is in soft-offline
router.beforeEach(async (to) => {
  try {
    await platform.fetch();
  } catch { void 0; }
  if (to.path === '/checkout' && platform.status.value === 'soft-offline') {
    // Inform the user using the global notify mechanism handled by App.vue
    try {
      // @ts-expect-error custom global event
      window.dispatchEvent(
        new CustomEvent('notify', {
          detail: { type: 'warning', message: 'Estamos en pausa momentánea. Podrás finalizar tu pedido en unos minutos.' },
        }),
      );
    } catch { void 0; }
    return { path: '/' };
  }
  return true;
});

export default router;
