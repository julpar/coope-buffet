import type { CustomerOrder } from '../types';

// Centralized status mapping for customer-facing UI.
// Keep aligned with app-staff Orders.vue labels.
export type OrderStatus = CustomerOrder['status'];

export const STATUS_MAP: Record<OrderStatus, { label: string; description: string }> = {
  pending_payment: {
    label: 'Pago pendiente',
    description: 'Tu pedido fue creado. Acercate a la caja para pagar y confirmar.'
  },
  paid: {
    label: 'Pagado',
    description: '¡Listo! Registramos el pago. El pedido entró en preparación.'
  },
  fulfilled: {
    label: 'Completado',
    description: 'Tu pedido fue completado. ¡Gracias por tu compra!'
  },
  cancelled: {
    label: 'Cancelado',
    description: 'Este pedido fue cancelado y no seguirá su curso.'
  }
};

export function statusLabel(status?: OrderStatus | string | null): string {
  if (!status) return '';
  // Narrow to known keys
  const key = String(status) as OrderStatus;
  return STATUS_MAP[key]?.label || String(status);
}

export function statusDescription(status?: OrderStatus | string | null): string {
  if (!status) return '';
  const key = String(status) as OrderStatus;
  return STATUS_MAP[key]?.description || '';
}
