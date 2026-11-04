import type { Address } from '@/account/account';
import { isAddress } from '@/account/account';
import { MAX_QUANTITY, type Bill, type CartLine, type CartState } from '@/cart/cart';
import type { Restaurant } from '@/data/catalog';
import { isRecord } from '@/lib/storage';

/** Requirement 11 statuses used by the customer prototype (Rejected is restaurant-driven and not simulated). */
export type OrderStatus = 'Placed' | 'Accepted' | 'Preparing' | 'Ready_For_Pickup' | 'Picked_Up' | 'Delivered' | 'Cancelled';

export interface OrderLine {
  itemId: string;
  name: string;
  veg: boolean;
  pricePaise: number;
  quantity: number;
}

export interface OrderRating {
  restaurant: number;
  driver: number;
  review: string;
}

/** Line items, prices and address are snapshots taken at placement (Requirement 10.5). */
export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  lines: OrderLine[];
  bill: Bill;
  address: Address;
  instructions: string;
  paymentLabel: string;
  placedAt: number;
  cancelledAt: number | null;
  rating: OrderRating | null;
}

export interface Stage {
  status: OrderStatus;
  atSeconds: number;
  label: string;
  detail: string;
}

/** Demo timeline: a full delivery plays out in two minutes so the tracking screen can be previewed. */
export const DEMO_STAGES: readonly Stage[] = [
  { status: 'Placed', atSeconds: 0, label: 'Order placed', detail: 'We have sent your order to the restaurant' },
  { status: 'Accepted', atSeconds: 8, label: 'Order accepted', detail: 'The restaurant has confirmed your order' },
  { status: 'Preparing', atSeconds: 20, label: 'Preparing your food', detail: 'Your meal is being freshly cooked' },
  { status: 'Ready_For_Pickup', atSeconds: 45, label: 'Ready for pickup', detail: 'Your rider is collecting the order' },
  { status: 'Picked_Up', atSeconds: 60, label: 'On the way', detail: 'Your rider is heading to you' },
  { status: 'Delivered', atSeconds: 120, label: 'Delivered', detail: 'Enjoy your meal' },
];

const PICKUP_SECONDS = 60;
export const DEMO_DELIVERY_SECONDS = 120;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  Placed: 'Order placed',
  Accepted: 'Accepted',
  Preparing: 'Preparing',
  Ready_For_Pickup: 'Ready for pickup',
  Picked_Up: 'On the way',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};

export const STATUS_HEADLINE: Record<OrderStatus, string> = {
  Placed: 'Waiting for the restaurant to accept',
  Accepted: 'The restaurant accepted your order',
  Preparing: 'Your food is being prepared',
  Ready_For_Pickup: 'Your rider is at the restaurant',
  Picked_Up: 'Your order is on the way',
  Delivered: 'Delivered. Enjoy your meal!',
  Cancelled: 'This order was cancelled',
};

function elapsedSeconds(order: Order, now: number): number {
  return Math.max(0, (now - order.placedAt) / 1000);
}

export function statusAt(order: Order, now: number): OrderStatus {
  if (order.cancelledAt !== null) return 'Cancelled';
  const elapsed = elapsedSeconds(order, now);
  let status: OrderStatus = 'Placed';
  for (const stage of DEMO_STAGES) {
    if (elapsed >= stage.atSeconds) status = stage.status;
  }
  return status;
}

/** Index in DEMO_STAGES, or -1 for Cancelled. */
export function stageIndex(status: OrderStatus): number {
  return DEMO_STAGES.findIndex((stage) => stage.status === status);
}

export function isActive(status: OrderStatus): boolean {
  return status !== 'Delivered' && status !== 'Cancelled';
}

/** 0 at pickup, 1 at the door. */
export function riderProgress(order: Order, now: number): number {
  const fraction = (elapsedSeconds(order, now) - PICKUP_SECONDS) / (DEMO_DELIVERY_SECONDS - PICKUP_SECONDS);
  return Math.min(1, Math.max(0, fraction));
}

/** Scales the demo timeline onto the restaurant's real ETA. */
export function minutesRemaining(order: Order, now: number, etaMinutes: number): number {
  const fractionLeft = 1 - Math.min(1, elapsedSeconds(order, now) / DEMO_DELIVERY_SECONDS);
  return Math.max(1, Math.ceil(etaMinutes * fractionLeft));
}

export function newOrderId(placedAt: number): string {
  const suffix = Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, '0');
  return `QB${placedAt.toString(36).slice(-5)}${suffix}`.toUpperCase();
}

export interface CreateOrderInput {
  id: string;
  restaurant: Restaurant;
  cart: CartState;
  bill: Bill;
  address: Address;
  instructions: string;
  paymentLabel: string;
  placedAt: number;
}

export function createOrder(input: CreateOrderInput): Order {
  return {
    id: input.id,
    restaurantId: input.restaurant.id,
    restaurantName: input.restaurant.name,
    lines: input.cart.lines.map(({ item, quantity }) => ({
      itemId: item.id,
      name: item.name,
      veg: item.veg,
      pricePaise: item.pricePaise,
      quantity,
    })),
    bill: input.bill,
    address: input.address,
    instructions: input.instructions,
    paymentLabel: input.paymentLabel,
    placedAt: input.placedAt,
    cancelledAt: null,
    rating: null,
  };
}

/** Requirement 10.7: reorder only items still on the menu, at current prices. */
export function reorderLines(order: Order, restaurant: Restaurant): CartLine[] {
  return order.lines.flatMap((line) => {
    const item = restaurant.menu.find((menuItem) => menuItem.id === line.itemId);
    return item ? [{ item, quantity: Math.min(MAX_QUANTITY, line.quantity) }] : [];
  });
}

export type OrdersAction =
  | { type: 'place'; order: Order }
  | { type: 'cancel'; orderId: string; at: number }
  | { type: 'rate'; orderId: string; rating: OrderRating };

export function ordersReducer(state: Order[], action: OrdersAction): Order[] {
  switch (action.type) {
    case 'place':
      return [action.order, ...state];
    case 'cancel':
      // Requirement 18.1: customers can cancel only while the order is Placed.
      return state.map((order) =>
        order.id === action.orderId && statusAt(order, action.at) === 'Placed' ? { ...order, cancelledAt: action.at } : order,
      );
    case 'rate':
      return state.map((order) =>
        order.id === action.orderId && order.rating === null && order.cancelledAt === null
          ? { ...order, rating: action.rating }
          : order,
      );
  }
}

const RIDERS = [
  { firstName: 'Ravi', vehicle: 'Honda Activa', plate: 'KA 01 HJ 4821', rating: 4.8 },
  { firstName: 'Arjun', vehicle: 'TVS Jupiter', plate: 'KA 03 MK 1902', rating: 4.9 },
  { firstName: 'Imran', vehicle: 'Bajaj Pulsar', plate: 'KA 05 LP 7734', rating: 4.7 },
  { firstName: 'Suresh', vehicle: 'Ather 450X', plate: 'KA 51 EV 2210', rating: 4.8 },
] as const;

export type Rider = (typeof RIDERS)[number];

/** Deterministic sample rider so the same order always shows the same person. */
export function riderFor(orderId: string): Rider {
  let hash = 0;
  for (const char of orderId) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  return RIDERS[hash % RIDERS.length] ?? RIDERS[0];
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isLine(value: unknown): value is OrderLine {
  return (
    isRecord(value) &&
    typeof value.itemId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.veg === 'boolean' &&
    isNumber(value.pricePaise) &&
    isNumber(value.quantity)
  );
}

function isBill(value: unknown): value is Bill {
  return (
    isRecord(value) &&
    isNumber(value.itemTotalPaise) &&
    isNumber(value.deliveryFeePaise) &&
    isNumber(value.platformFeePaise) &&
    isNumber(value.taxesPaise) &&
    isNumber(value.totalPaise)
  );
}

function isRating(value: unknown): value is OrderRating {
  return isRecord(value) && isNumber(value.restaurant) && isNumber(value.driver) && typeof value.review === 'string';
}

function isOrder(value: unknown): value is Order {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.restaurantId === 'string' &&
    typeof value.restaurantName === 'string' &&
    Array.isArray(value.lines) &&
    value.lines.every(isLine) &&
    isBill(value.bill) &&
    isAddress(value.address) &&
    typeof value.instructions === 'string' &&
    typeof value.paymentLabel === 'string' &&
    isNumber(value.placedAt) &&
    (value.cancelledAt === null || isNumber(value.cancelledAt)) &&
    (value.rating === null || isRating(value.rating))
  );
}

export function reviveOrders(raw: unknown): Order[] | null {
  return Array.isArray(raw) ? raw.filter(isOrder) : null;
}