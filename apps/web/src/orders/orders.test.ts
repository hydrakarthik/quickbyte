import { describe, expect, it } from 'vitest';
import type { Address } from '@/account/account';
import { computeBill, emptyCart, cartReducer } from '@/cart/cart';
import { restaurants } from '@/data/catalog';
import {
  createOrder,
  DEMO_DELIVERY_SECONDS,
  minutesRemaining,
  ordersReducer,
  reorderLines,
  reviveOrders,
  riderFor,
  riderProgress,
  statusAt,
} from './orders';

const restaurant = restaurants[0];
if (!restaurant) throw new Error('catalog is empty');
const firstItem = restaurant.menu[0];
if (!firstItem) throw new Error('menu is empty');

const address: Address = { id: 'a1', label: 'Home', line1: 'Flat 1, Test Lane', area: 'Koramangala', city: 'Bengaluru' };
const placedAt = 1_700_000_000_000;
const cart = cartReducer(emptyCart, { type: 'add', restaurantId: restaurant.id, item: firstItem });
const order = createOrder({
  id: 'QBTEST1',
  restaurant,
  cart,
  bill: computeBill(cart, restaurant.deliveryFeePaise),
  address,
  instructions: '',
  paymentLabel: 'Visa ending 4242',
  placedAt,
});

const at = (seconds: number) => placedAt + seconds * 1000;

describe('order lifecycle', () => {
  it('advances through the demo stages in order', () => {
    expect(statusAt(order, at(0))).toBe('Placed');
    expect(statusAt(order, at(10))).toBe('Accepted');
    expect(statusAt(order, at(30))).toBe('Preparing');
    expect(statusAt(order, at(50))).toBe('Ready_For_Pickup');
    expect(statusAt(order, at(90))).toBe('Picked_Up');
    expect(statusAt(order, at(DEMO_DELIVERY_SECONDS))).toBe('Delivered');
  });

  it('snapshots line items and prices at placement', () => {
    expect(order.lines).toEqual([
      { itemId: firstItem.id, name: firstItem.name, veg: firstItem.veg, pricePaise: firstItem.pricePaise, quantity: 1 },
    ]);
  });

  it('allows cancellation only while the order is Placed', () => {
    const early = ordersReducer([order], { type: 'cancel', orderId: order.id, at: at(3) });
    expect(statusAt(early[0] ?? order, at(200))).toBe('Cancelled');

    const late = ordersReducer([order], { type: 'cancel', orderId: order.id, at: at(30) });
    expect(late[0]?.cancelledAt).toBeNull();
  });

  it('accepts one rating per order', () => {
    const rated = ordersReducer([order], { type: 'rate', orderId: order.id, rating: { restaurant: 5, driver: 4, review: 'Great' } });
    const again = ordersReducer(rated, { type: 'rate', orderId: order.id, rating: { restaurant: 1, driver: 1, review: '' } });
    expect(again[0]?.rating).toEqual({ restaurant: 5, driver: 4, review: 'Great' });
  });

  it('keeps rider progress and ETA within bounds', () => {
    expect(riderProgress(order, at(0))).toBe(0);
    expect(riderProgress(order, at(90))).toBeCloseTo(0.5);
    expect(riderProgress(order, at(500))).toBe(1);
    expect(minutesRemaining(order, at(0), 30)).toBe(30);
    expect(minutesRemaining(order, at(500), 30)).toBe(1);
  });

  it('assigns the same rider to the same order', () => {
    expect(riderFor('QBTEST1')).toEqual(riderFor('QBTEST1'));
  });
});

describe('reorder and storage', () => {
  it('reorders items that are still on the menu at current prices', () => {
    const withRemovedItem = { ...order, lines: [...order.lines, { itemId: 'gone', name: 'Gone', veg: true, pricePaise: 1, quantity: 2 }] };
    const lines = reorderLines(withRemovedItem, restaurant);
    expect(lines.map((line) => line.item.id)).toEqual([firstItem.id]);
  });

  it('revives valid stored orders and drops malformed ones', () => {
    const stored = JSON.parse(JSON.stringify([order, { id: 42 }, 'junk'])) as unknown;
    expect(reviveOrders(stored)).toEqual([order]);
    expect(reviveOrders({ not: 'an array' })).toBeNull();
  });
});