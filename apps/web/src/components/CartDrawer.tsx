import type { Bill, CartControls, CartState } from '@/cart/cart';
import type { Restaurant } from '@/data/catalog';
import { formatPaise } from '@/lib/format';
import { AddControl } from './AddControl';
import { VegMark } from './badges';
import { BillSummary } from './BillSummary';
import { FoodImage } from './FoodImage';
import { BagIcon, XIcon } from './icons';
import { Modal } from './Modal';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartState;
  restaurant: Restaurant | null;
  bill: Bill;
  controls: CartControls;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, onClose, cart, restaurant, bill, controls, onClear, onCheckout }: CartDrawerProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="cart-heading" variant="drawer">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="cart-heading" className="text-xl font-extrabold">
          Your cart
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
          className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-muted"
        >
          <XIcon />
        </button>
      </div>

      {cart.lines.length === 0 || !restaurant ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-accent text-primary">
            <BagIcon className="h-10 w-10" />
          </span>
          <p className="mt-5 text-lg font-bold">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Good food is always cooking. Add something tasty from a restaurant near you.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 min-h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:brightness-110"
          >
            Browse restaurants
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <div className="flex items-center gap-3">
              <FoodImage src={restaurant.image} alt="" className="h-14 w-14 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate font-bold">{restaurant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {restaurant.area} &middot; {restaurant.etaMinutes}-{restaurant.etaMinutes + 5} mins
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-5">
              {cart.lines.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-center gap-3">
                  <VegMark veg={item.veg} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatPaise(item.pricePaise)} each</p>
                  </div>
                  <AddControl restaurant={restaurant} item={item} controls={controls} />
                  <p className="w-16 text-right text-sm font-bold tabular-nums">{formatPaise(item.pricePaise * quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <BillSummary bill={bill} />
            </div>

            <button type="button" onClick={onClear} className="mt-4 min-h-11 text-sm font-semibold text-destructive hover:underline">
              Clear cart
            </button>
          </div>

          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={onCheckout}
              className="flex w-full items-center justify-between rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
            >
              <span className="tabular-nums">{formatPaise(bill.totalPaise)}</span>
              <span>Proceed to checkout</span>
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}