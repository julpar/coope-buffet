import { reactive, computed } from 'vue';
import type { StaffOrder, OrderStatus } from '../types';

const LS_KEY = 'staff-orders-mock';

function seed(): StaffOrder[] {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) return JSON.parse(raw);
  const now = Date.now();
  const data: StaffOrder[] = [
    { id: 'o-1001', createdAt: new Date(now - 1000 * 60 * 12).toISOString(), status: 'awaiting-cash', channel: 'in-store', total: 6200, items: [ { id: 'choripan', qty: 2, price: 2500 }, { id: 'cola', qty: 1, price: 1200 } ] },
    { id: 'o-1002', createdAt: new Date(now - 1000 * 60 * 8).toISOString(), status: 'received', channel: 'pickup', total: 2000, items: [ { id: 'ensalada', qty: 1, price: 2000 } ] },
    { id: 'o-1003', createdAt: new Date(now - 1000 * 60 * 4).toISOString(), status: 'preparing', channel: 'delivery', total: 2500, items: [ { id: 'choripan', qty: 1, price: 2500 } ] },
    { id: 'o-1004', createdAt: new Date(now - 1000 * 60 * 2).toISOString(), status: 'ready', channel: 'pickup', total: 3700, items: [ { id: 'choripan', qty: 1, price: 2500 }, { id: 'ensalada', qty: 1, price: 1200 } ] },
  ];
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  return data;
}

const state = reactive({
  list: seed() as StaffOrder[],
});

function persist() { localStorage.setItem(LS_KEY, JSON.stringify(state.list)); }

export function useOrders() {
  const orders = computed(() => state.list.slice().sort((a,b) => a.createdAt.localeCompare(b.createdAt)));
  function setStatus(id: string, status: OrderStatus) {
    const idx = state.list.findIndex(o => o.id === id);
    if (idx >= 0) { state.list[idx].status = status; persist(); }
  }
  function add(order: StaffOrder) { state.list.push(order); persist(); }
  const counters = computed(() => ({
    awaitingCash: state.list.filter(o => o.status === 'awaiting-cash').length,
    received: state.list.filter(o => o.status === 'received').length,
    preparing: state.list.filter(o => o.status === 'preparing').length,
    ready: state.list.filter(o => o.status === 'ready').length,
  }));
  return { orders, setStatus, add, counters };
}
