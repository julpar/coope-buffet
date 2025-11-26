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
  price: number;
  imageUrl?: string | null;
  isGlutenFree?: boolean;
  stock?: number;
  lowStockThreshold?: number;
  active?: boolean;
  availability?: Availability;
}

export interface OrderItemRef {
  id: string;
  qty: number;
  price: number;
  // When present, signals a probable stock problem to fulfillers
  stockWarning?: boolean;
}

export type OrderStatus = 'received' | 'preparing' | 'ready' | 'out' | 'completed' | 'cancelled' | 'awaiting-cash';

export type PaymentInfo = {
  method: 'online' | 'cash';
  externalId?: string | null;
  paidAt?: string | null;
};

export interface StaffOrder {
  id: string;
  createdAt: string;
  status: OrderStatus;
  channel: 'pickup' | 'delivery' | 'in-store';
  total: number;
  items: OrderItemRef[];
  note?: string;
  // Optional payment block provided by backend
  payment?: PaymentInfo;
}
