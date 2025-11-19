export type Availability = 'in-stock' | 'limited' | 'sold-out';

export interface Category {
  id: string;
  name: string;
  order?: number;
}

export interface Item {
  id: string;
  name: string;
  categoryId: string;
  price: number; // ARS units (not cents)
  imageUrl?: string | null;
  isGlutenFree?: boolean;
  stock?: number;
  lowStockThreshold?: number;
  availability?: Availability;
}

export interface MenuResponse {
  categories: Array<{
    id: string;
    name: string;
    order?: number;
    items: Item[];
  }>;
  glutenFree: Item[];
}

export type OrderChannel = 'pickup' | 'delivery' | 'in-store';

export interface OrderItemRef {
  id: string;
  name?: string;
  unitPrice: number; // ARS units (not cents)
  qty: number;
}

export interface CustomerOrder {
  id: string;
  createdAt: string;
  updatedAt: string;
  channel: OrderChannel;
  status: 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled';
  shortCode: string;
  items: OrderItemRef[];
  subtotal: number; // ARS units (not cents)
  total: number; // ARS units (not cents)
  customerName?: string;
  payment?: { method: 'online' | 'cash'; externalId?: string | null; paidAt?: string | null };
}
