// Shared UI constants for the customer app

// Category IDs (slugs) for which items with stock <= 0 should be hidden
// Keep values in lowercase; callers should normalize ids before lookup.
export const HIDE_ZERO_STOCK_CATEGORIES = new Set<string>([
  'feria-del-plat',
]);
