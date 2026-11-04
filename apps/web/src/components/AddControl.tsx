import { MAX_QUANTITY, type CartControls } from '@/cart/cart';
import type { MenuItem, Restaurant } from '@/data/catalog';
import { MinusIcon, PlusIcon } from './icons';

interface AddControlProps {
  restaurant: Restaurant;
  item: MenuItem;
  controls: CartControls;
}

export function AddControl({ restaurant, item, controls }: AddControlProps) {
  const quantity = controls.quantityOf(item.id);

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => {
          controls.add(restaurant, item);
        }}
        aria-label={`Add ${item.name} to cart`}
        className="h-11 w-28 rounded-xl border border-border bg-white text-sm font-extrabold uppercase tracking-wider text-success shadow-md transition hover:bg-green-50 active:scale-95"
      >
        Add
      </button>
    );
  }

  return (
    <div className="flex h-11 w-28 items-center justify-between rounded-xl bg-success text-success-foreground shadow-md">
      <button
        type="button"
        onClick={() => {
          controls.decrement(item.id);
        }}
        aria-label={`Remove one ${item.name}`}
        className="grid h-11 w-10 place-items-center rounded-l-xl transition hover:bg-black/15 active:scale-90"
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="text-sm font-extrabold tabular-nums">{quantity}</span>
      <button
        type="button"
        onClick={() => {
          controls.increment(item.id);
        }}
        disabled={quantity >= MAX_QUANTITY}
        aria-label={`Add one more ${item.name}`}
        className="grid h-11 w-10 place-items-center rounded-r-xl transition hover:bg-black/15 active:scale-90 disabled:opacity-50"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}