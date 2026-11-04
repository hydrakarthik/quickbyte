import { describe, expect, it } from 'vitest';
import { restaurants, type MenuItem } from '@/data/catalog';
import {
  cartReducer,
  computeBill,
  emptyCart,
  itemCount,
  MAX_QUANTITY,
  PLATFORM_FEE_PAISE,
  quantityOf,
  reviveCart,
  subtotalPaise,
  type CartState,
} from './cart';

function makeItem(id: string, pricePaise: number): MenuItem {
  return { id, name: id, description: '', pricePaise, veg: true, bestseller: false, image: '' };
}

const naan = makeItem('naan', 10000);
const curry = makeItem('curry', 25000);

function add(state: CartState, item: MenuItem, restaurantId = 'r1'): CartState {
  return cartReducer(state, { type: 'add', restaurantId, item });
}

describe('cartReducer', () => {
  it('adds items and computes the subtotal as price times quantity', () => {
    const cart = add(add(add(emptyCart, naan), naan), curry);
    expect(quantityOf(cart, 'naan')).toBe(2);
    expect(itemCount(cart)).toBe(3);
    expect(subtotalPaise(cart)).toBe(45000);
  });

  it('restores the previous cart when a line is added then removed', () => {
    const before = add(emptyCart, naan);
    const after = cartReducer(add(before, curry), { type: 'remove', itemId: 'curry' });
    expect(after).toEqual(before);
  });

  it('removes a line and empties the cart when quantity reaches zero', () => {
    const cart = cartReducer(add(emptyCart, naan), { type: 'decrement', itemId: 'naan' });
    expect(cart).toEqual(emptyCart);
  });

  it('caps quantity at the maximum', () => {
    let cart = add(emptyCart, naan);
    for (let i = 0; i < MAX_QUANTITY + 10; i += 1) {
      cart = cartReducer(cart, { type: 'increment', itemId: 'naan' });
    }
    expect(quantityOf(cart, 'naan')).toBe(MAX_QUANTITY);
  });

  it('starts a new cart when adding from a different restaurant', () => {
    const cart = add(add(emptyCart, naan, 'r1'), curry, 'r2');
    expect(cart.restaurantId).toBe('r2');
    expect(cart.lines.map((line) => line.item.id)).toEqual(['curry']);
  });
});

describe('computeBill', () => {
  it('adds delivery, platform fee and rounded GST to the item total', () => {
    const cart = add(add(emptyCart, naan), curry);
    const bill = computeBill(cart, 3900);
    expect(bill.itemTotalPaise).toBe(35000);
    expect(bill.taxesPaise).toBe(1800);
    expect(bill.totalPaise).toBe(35000 + 3900 + PLATFORM_FEE_PAISE + 1800);
  });

  it('is all zeros for an empty cart', () => {
    expect(computeBill(emptyCart, 3900).totalPaise).toBe(0);
  });
});
describe('replace and revive', () => {
  it('replaces the cart with the given restaurant and lines', () => {
    const cart = cartReducer(add(emptyCart, naan, 'r1'), { type: 'replace', restaurantId: 'r2', lines: [{ item: curry, quantity: 3 }] });
    expect(cart).toEqual({ restaurantId: 'r2', lines: [{ item: curry, quantity: 3 }] });
  });

  it('rebuilds a stored cart from the catalog and ignores tampered prices', () => {
    const restaurant = restaurants[0];
    const item = restaurant?.menu[0];
    if (!restaurant || !item) throw new Error('catalog is empty');
    const stored: unknown = {
      restaurantId: restaurant.id,
      lines: [
        { item: { ...item, pricePaise: 1 }, quantity: 2 },
        { item: { id: 'unknown' }, quantity: 1 },
        { item, quantity: 500 },
      ],
    };
    const revived = reviveCart(stored, restaurants);
    expect(revived?.lines).toEqual([{ item, quantity: 2 }]);
  });

  it('returns null for unknown restaurants or junk', () => {
    expect(reviveCart({ restaurantId: 'nope', lines: [] }, restaurants)).toBeNull();
    expect(reviveCart('junk', restaurants)).toBeNull();
  });
});