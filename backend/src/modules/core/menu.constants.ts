import type { Category } from './menu.service';

// Hardcoded default categories for staff menu management
// These mirror the mock categories used in the staff SPA and are stable slugs.
export const MENU_CATEGORIES: Category[] = [
  { id: 'parrilla', name: 'PARRILLA', order: 1 },
  { id: 'feria-del-plat', name: 'FERIA DEL PLATO', order: 2 },
  { id: 'bebidas', name: 'BEBIDAS', order: 3 },
  { id: 'otros', name: 'OTROS', order: 4 },
];
