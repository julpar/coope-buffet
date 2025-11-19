import { computed, ref, watch } from 'vue';
import type { Item, OrderItemRef } from '../types';

type CartItem = OrderItemRef;

const LS_KEY = 'customer-cart-v1';

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function save(items: CartItem[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
}

const itemsRef = ref<CartItem[]>(load());

watch(itemsRef, (v) => save(v), { deep: true });

function findIndex(id: string) { return itemsRef.value.findIndex(i => i.id === id); }

export const cart = {
  items: itemsRef,
  totalQty: computed(() => itemsRef.value.reduce((acc, it) => acc + it.qty, 0)),
  subtotal: computed(() => itemsRef.value.reduce((acc, it) => acc + it.qty * it.unitPrice, 0)),
  clear() { itemsRef.value = []; },
  add(product: Item, qty = 1) {
    const idx = findIndex(product.id);
    const amount = Math.max(1, Math.floor(qty));
    if (idx >= 0) {
      itemsRef.value[idx].qty += amount;
    } else {
      itemsRef.value.push({ id: product.id, name: product.name, unitPrice: product.price, qty: amount });
    }
  },
  setQuantity(id: string, qty: number) {
    const idx = findIndex(id);
    const amount = Math.max(0, Math.floor(qty));
    if (idx >= 0) {
      if (amount <= 0) itemsRef.value.splice(idx, 1); else itemsRef.value[idx].qty = amount;
    }
  },
  increase(id: string) {
    const idx = findIndex(id); if (idx >= 0) itemsRef.value[idx].qty += 1;
  },
  decrease(id: string) {
    const idx = findIndex(id); if (idx >= 0) {
      const next = itemsRef.value[idx].qty - 1;
      if (next <= 0) itemsRef.value.splice(idx, 1); else itemsRef.value[idx].qty = next;
    }
  },
  remove(id: string) {
    const idx = findIndex(id); if (idx >= 0) itemsRef.value.splice(idx, 1);
  },
  toOrderItems(): Array<{ id: string; qty: number }> {
    return itemsRef.value.map(i => ({ id: i.id, qty: i.qty }));
  }
};
