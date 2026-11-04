import type { MenuItem, Restaurant } from '@/data/catalog';
import { isRecord } from '@/lib/storage';

export const MAX_QUANTITY = 99;
export const PLATFORM_FEE_PAISE = 500;
export const GST_RATE = 0.05;

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

/** A cart holds items from exactly one restaurant (Requirement 7.3). */
export interface CartState {
  restaurantId: string | null;
  lines: CartLine[];
}

export type CartAction =
  | { type: 'add'; restaurantId: string; item: MenuItem }
  | { type: 'increment'; itemId: string }
  | { type: 'decrement'; itemId: string }
  | { type: 'remove'; itemId: string }
  | { type: 'replace'; restaurantId: string; lines: CartLine[] }
  | { type: 'clear' };

export interface CartControls {
  quantityOf: (itemId: string) => number;
  add: (restaurant: Restaurant, item: MenuItem) => void;
  increment: (itemId: string) => void;
  decrement: (itemId: string) => void;
}

export interface Bill {
  itemTotalPaise: number;
  deliveryFeePaise: number;
  platformFeePaise: number;
  taxesPaise: number;
  totalPaise: number;
}

export const emptyCart: CartState = { restaurantId: null, lines: [] };

function withLines(state: CartState, lines: CartLine[]): CartState {
  return lines.length === 0 ? emptyCart : { ...state, lines };
}

function changeQuantity(state: CartState, itemId: string, delta: number): CartState {
  const lines = state.lines.flatMap((line) => {
    if (line.item.id !== itemId) return [line];
    const quantity = Math.min(MAX_QUANTITY, line.quantity + delta);
    return quantity <= 0 ? [] : [{ ...line, quantity }];
  });
  return withLines(state, lines);
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      // The UI confirms with the customer before replacing a cart from another restaurant.
      if (state.restaurantId !== action.restaurantId) {
        return { restaurantId: action.restaurantId, lines: [{ item: action.item, quantity: 1 }] };
      }
      if (state.lines.some((line) => line.item.id === action.item.id)) {
        return changeQuantity(state, action.item.id, 1);
      }
      return { ...state, lines: [...state.lines, { item: action.item, quantity: 1 }] };
    }
    case 'increment':
      return changeQuantity(state, action.itemId, 1);
    case 'decrement':
      return changeQuantity(state, action.itemId, -1);
    case 'remove':
      return withLines(state, state.lines.filter((line) => line.item.id !== action.itemId));
    case 'replace':
      return withLines({ restaurantId: action.restaurantId, lines: [] }, action.lines);
    case 'clear':
      return emptyCart;
  }
}

export function quantityOf(state: CartState, itemId: string): number {
  return state.lines.find((line) => line.item.id === itemId)?.quantity ?? 0;
}

export function itemCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function subtotalPaise(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.item.pricePaise * line.quantity, 0);
}

/** Prototype pricing only. The real fee and tax rules come from admin configuration (Requirement 8). */
export function computeBill(state: CartState, deliveryFeePaise: number): Bill {
  const itemTotalPaise = subtotalPaise(state);
  if (itemTotalPaise === 0) {
    return { itemTotalPaise: 0, deliveryFeePaise: 0, platformFeePaise: 0, taxesPaise: 0, totalPaise: 0 };
  }
  const taxesPaise = Math.round((itemTotalPaise * GST_RATE) / 100) * 100;
  return {
    itemTotalPaise,
    deliveryFeePaise,
    platformFeePaise: PLATFORM_FEE_PAISE,
    taxesPaise,
    totalPaise: itemTotalPaise + deliveryFeePaise + PLATFORM_FEE_PAISE + taxesPaise,
  };
}

/** Rebuilds a stored cart against the current catalog, so prices and items are never taken from storage. */
export function reviveCart(raw: unknown, catalog: readonly Restaurant[]): CartState | null {
  if (!isRecord(raw) || typeof raw.restaurantId !== 'string' || !Array.isArray(raw.lines)) return null;
  const restaurantId = raw.restaurantId;
  const restaurant = catalog.find((r) => r.id === restaurantId);
  if (!restaurant) return null;

  const lines: CartLine[] = [];
  for (const line of raw.lines as unknown[]) {
    if (!isRecord(line) || !isRecord(line.item) || typeof line.quantity !== 'number') continue;
    const itemId = line.item.id;
    const item = restaurant.menu.find((menuItem) => menuItem.id === itemId);
    const quantity = Math.trunc(line.quantity);
    if (item && quantity >= 1 && quantity <= MAX_QUANTITY) lines.push({ item, quantity });
  }
  return lines.length > 0 ? { restaurantId, lines } : null;
}