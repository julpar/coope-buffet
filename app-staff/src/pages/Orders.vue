<template>
  <section class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px">
      <h3 style="margin:0">Órdenes</h3>
      <div class="muted">Tap/clic para mover por el flujo</div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Hora</th>
          <th>Canal</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in orders" :key="o.id">
          <td>{{ o.id }}</td>
          <td>{{ new Date(o.createdAt).toLocaleTimeString() }}</td>
          <td>{{ o.channel }}</td>
          <td>${{ o.total }}</td>
          <td>
            <span :style="badgeStyle(o.status)">{{ o.status }}</span>
          </td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn" @click="advance(o.id, o.status)">Avanzar</button>
              <button class="btn ghost" @click="setStatus(o.id, 'cancelled')">Cancelar</button>
              <button class="btn ghost" @click="setStatus(o.id, 'completed')">Completar</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import type { OrderStatus } from '../types';
import { useOrders } from '../store/orders';

const { orders, setStatus } = useOrders();

function nextStatus(s: OrderStatus): OrderStatus {
  switch (s) {
    case 'awaiting-cash': return 'received';
    case 'received': return 'preparing';
    case 'preparing': return 'ready';
    case 'ready': return 'completed';
    default: return s;
  }
}
function advance(id: string, s: OrderStatus) { setStatus(id, nextStatus(s)); }

function badgeStyle(s: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    'awaiting-cash': '#795548',
    'received': '#0288d1',
    'preparing': '#f9a825',
    'ready': '#2e7d32',
    'out': '#6a1b9a',
    'completed': '#616161',
    'cancelled': '#b71c1c',
  };
  return { background: map[s], color: '#fff', padding: '4px 8px', borderRadius: '999px', fontSize: '12px' };
}
</script>
