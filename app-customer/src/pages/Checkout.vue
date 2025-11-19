<template>
  <div class="checkout">
    <h2>Finalizar pedido</h2>
    <div v-if="items.length === 0" class="muted">No hay items en el carrito.</div>
    <div v-else class="content">
      <section class="review">
        <h3>Resumen</h3>
        <div class="list">
          <div v-for="it in items" :key="it.id" class="row">
            <div class="name">{{ it.name }} <small class="muted">x{{ it.qty }}</small></div>
            <div class="price">{{ currency(it.unitPrice * it.qty) }}</div>
          </div>
        </div>
        <div class="total">
          <div>Total</div>
          <div class="price">{{ currency(subtotal) }}</div>
        </div>
      </section>

      <section class="details">
        <h3>Detalles</h3>
        <n-form label-placement="top">
          <n-form-item label="Tu nombre (opcional)">
            <n-input v-model:value="customerName" placeholder="Ej: Juan" />
          </n-form-item>
        </n-form>
      </section>

      <section class="pay">
        <h3>Pago</h3>
        <p class="muted">Por ahora solo en efectivo. El pedido quedará pendiente de validar manualmente por el personal.</p>
        <n-button type="primary" :loading="loading" :disabled="items.length===0" @click="placeOrder">Confirmar pedido y generar QR</n-button>
        <div v-if="error" class="error">{{ error }}</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { cart } from '../lib/cart';
import { customerApi } from '../lib/api';

const router = useRouter();
const items = computed(() => cart.items.value);
const subtotal = computed(() => cart.subtotal.value);
const customerName = ref('');
const loading = ref(false);
const error = ref('');

// Monetary values are provided in ARS units (not cents)
function currency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

async function placeOrder() {
  loading.value = true; error.value = '';
  try {
    const res = await customerApi.createOrder({
      // Only pickup is supported as ordering modality
      channel: 'pickup',
      items: cart.toOrderItems(),
      customerName: customerName.value || undefined,
      paymentMethod: 'cash'
    });
    cart.clear();
    router.replace(`/success/${res.id}`);
  } catch (e: any) {
    error.value = e?.message || 'No se pudo crear el pedido.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.checkout { display: flex; flex-direction: column; gap: 12px; }
.muted { color: #666; }
.content { display: flex; flex-direction: column; gap: 16px; }
.review .list { display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; justify-content: space-between; }
.name { font-weight: 500; }
.price { font-weight: 600; }
.total { display: flex; justify-content: space-between; border-top: 1px dashed #ddd; padding-top: 8px; margin-top: 8px; }
.error { margin-top: 8px; color: #b71c1c; }
</style>
