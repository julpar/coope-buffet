<template>
  <n-message-provider>
    <n-config-provider>
      <n-layout class="layout">
        <n-layout-header bordered class="header">
          <div class="brand">
            <span class="logo">🍽️</span>
            <span>Buffet</span>
          </div>
          <div class="cart" @click="toggleCart">
            <n-badge :value="cartQty" :max="99" type="success">
              <n-button quaternary>
                <template #icon>
                  <n-icon><CartOutline /></n-icon>
                </template>
                <span class="hide-on-mobile">Carrito</span>
              </n-button>
            </n-badge>
            <span class="subtotal" v-if="cartQty > 0">{{ currency(subtotal) }}</span>
          </div>
        </n-layout-header>

        <!-- Soft-offline banner overlay -->
        <div v-if="platform.status === 'soft-offline'" class="soft-overlay" role="dialog" aria-modal="true">
          <div class="soft-card">
            <h3>Estamos en pausa momentánea</h3>
            <p>{{ platform.message || 'Volvemos en unos minutos.' }}</p>
          </div>
        </div>

        <n-layout-content class="main">
          <RouterView />
        </n-layout-content>

        <!-- Cart drawer -->
        <n-drawer v-model:show="drawer" placement="right" :width="320">
          <n-drawer-content title="Tu pedido">
            <div v-if="items.length === 0" class="muted">El carrito está vacío.</div>
            <div v-else class="cart-list">
              <div v-for="it in items" :key="it.id" class="cart-row">
                <div class="info">
                  <strong>{{ it.name }}</strong>
                  <small class="muted">{{ currency(it.unitPrice) }} c/u</small>
                </div>
                <div class="qty">
                  <n-button size="small" tertiary @click="dec(it.id)">-</n-button>
                  <span class="q">{{ it.qty }}</span>
                  <n-button size="small" tertiary @click="inc(it.id)">+</n-button>
                </div>
                <div class="row-total">{{ currency(it.unitPrice * it.qty) }}</div>
              </div>
              <n-divider />
              <div class="totals">
                <div>Subtotal</div>
                <div>{{ currency(subtotal) }}</div>
              </div>
              <n-button type="primary" :disabled="items.length===0 || platform.status==='soft-offline'" @click="goCheckout">
                Continuar al pago
              </n-button>
            </div>
          </n-drawer-content>
        </n-drawer>
      </n-layout>
    </n-config-provider>
  </n-message-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { CartOutline } from '@vicons/ionicons5';
import { cart } from './lib/cart';
import { platform } from './lib/platform';

const router = useRouter();
const drawer = ref(false);

const items = computed(() => cart.items.value);
const subtotal = computed(() => cart.subtotal.value);
const cartQty = computed(() => cart.totalQty.value);

function currency(cents: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100);
}

function toggleCart() { drawer.value = !drawer.value; }
function goCheckout() { drawer.value = false; router.push('/checkout'); }

function inc(id: string) { cart.increase(id); }
function dec(id: string) { cart.decrease(id); }

onMounted(() => {
  platform.start();
});
</script>

<style scoped>
.layout { min-height: 100vh; background: #fafafa; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.logo { font-size: 18px; }
.cart { display: flex; align-items: center; gap: 8px; }
.subtotal { font-weight: 600; }
.main { padding: 12px; }
.hide-on-mobile { display: none; }
@media (min-width: 640px) { .hide-on-mobile { display: inline; } }

.muted { color: #666; }
.cart-list { display: flex; flex-direction: column; gap: 10px; }
.cart-row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 8px; }
.cart-row .info { display: flex; flex-direction: column; }
.cart-row .qty { display: flex; align-items: center; gap: 6px; }
.cart-row .q { min-width: 20px; text-align: center; }
.row-total { font-weight: 600; }
.totals { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px; }

.soft-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 20; }
.soft-card { background: #111; color: #fff; padding: 16px; border-radius: 10px; text-align: center; max-width: 480px; margin: 0 12px; }
</style>
