// Reusable helpers to detect and handle insufficient stock errors in the
// customer checkout flow. Centralizes the UI reaction (redirect, notification,
// open cart) to avoid duplication across payment methods.

export type Shortage = { id: string; name?: string; requested?: number; available?: number };

function buildLines(shortages: Shortage[]): string[] {
  const lines: string[] = [];
  for (const s of shortages) {
    const avail = Math.max(0, Number(s.available ?? 0));
    const req = Math.max(0, Number(s.requested ?? 0));
    const name = (s as any).name || (s as any).id;
    lines.push(`${name}: disponible ${avail} (pediste ${req})`);
  }
  return lines;
}

function tryParseJsonFromText(text: string | undefined | null): any | null {
  if (!text) return null;
  const raw = String(text);
  if (!raw.includes('{') || !raw.includes('}')) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function extractShortagesFromError(e: any): Shortage[] | null {
  // Case 1: structured error already surfaced with code+shortages
  if (e && e.code === 'INSUFFICIENT_STOCK' && Array.isArray(e.shortages)) {
    return e.shortages as Shortage[];
  }
  // Case 2: HttpError with JSON body captured as text
  const json = tryParseJsonFromText((e && e.bodyText) || (e && e.message));
  if (json && json.code === 'INSUFFICIENT_STOCK' && Array.isArray(json.shortages)) {
    return json.shortages as Shortage[];
  }
  return null;
}

export function handleInsufficientStock(e: any, router: { replace: (path: string) => any }): boolean {
  const shortages = extractShortagesFromError(e);
  if (!shortages) return false;

  const lines = buildLines(shortages);
  // Navigate back to the menu and open the cart for editing
  try { router.replace('/'); } catch { void 0; }
  // Dispatch UI events after a small delay to ensure the route is settled
  setTimeout(() => {
    const shortageIds = shortages.map((s) => (s as any).id).filter(Boolean);
    // @ts-expect-error custom event for app coordination
    window.dispatchEvent(new CustomEvent('set-shortages', { detail: { shortages } }));
    window.dispatchEvent(
      new CustomEvent('notify', {
        detail: {
          type: 'warning',
          message: 'No hay stock suficiente. Ajustá las cantidades:',
          description: lines.join(' · '),
          shortageIds,
          shortages,
        },
      }),
    );
    window.dispatchEvent(new CustomEvent('open-cart'));
  }, 50);

  return true;
}
