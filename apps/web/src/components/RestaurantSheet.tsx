import { useState } from 'react';
import type { CartControls } from '@/cart/cart';
import type { Restaurant } from '@/data/catalog';
import { deliveryLabel, formatCount, formatPaise } from '@/lib/format';
import { AddControl } from './AddControl';
import { RatingBadge, VegMark } from './badges';
import { FoodImage } from './FoodImage';
import { BagIcon, ClockIcon, StarIcon, TagIcon, XIcon } from './icons';
import { Modal } from './Modal';

interface RestaurantSheetProps {
  restaurant: Restaurant | null;
  onClose: () => void;
  controls: CartControls;
  cartCount: number;
  cartSubtotalPaise: number;
  onOpenCart: () => void;
}

export function RestaurantSheet({
  restaurant,
  onClose,
  controls,
  cartCount,
  cartSubtotalPaise,
  onOpenCart,
}: RestaurantSheetProps) {
  const [vegOnly, setVegOnly] = useState(false);
  if (!restaurant) return null;

  const items = vegOnly ? restaurant.menu.filter((item) => item.veg) : restaurant.menu;
  const headingId = `restaurant-${restaurant.id}-heading`;

  return (
    <Modal open onClose={onClose} labelledBy={headingId} variant="sheet">
      <div className="relative h-44 shrink-0 sm:h-56">
        <FoodImage src={restaurant.image} alt={restaurant.name} className="h-full w-full" />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-black/10" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-foreground shadow-lg transition hover:bg-white"
        >
          <XIcon />
        </button>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h2 id={headingId} className="text-2xl font-extrabold sm:text-3xl">
            {restaurant.name}
          </h2>
          <p className="mt-0.5 text-sm text-white/85">
            {restaurant.cuisines.join(', ')} &middot; {restaurant.area}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-3 text-sm font-semibold">
        <span className="inline-flex items-center gap-2">
          <RatingBadge rating={restaurant.rating} />
          <span className="text-muted-foreground">{formatCount(restaurant.ratingCount)} ratings</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
          {restaurant.etaMinutes}-{restaurant.etaMinutes + 5} mins
        </span>
        <span>{deliveryLabel(restaurant.deliveryFeePaise)}</span>
        {restaurant.offer ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary">
            <TagIcon className="h-3.5 w-3.5" />
            {restaurant.offer}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between px-5 pt-5">
        <h3 className="text-lg font-extrabold">Menu</h3>
        {restaurant.pureVeg ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-success">Pure Veg kitchen</span>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(event) => {
                setVegOnly(event.target.checked);
              }}
              className="h-4 w-4 accent-success"
            />
            Veg only
          </label>
        )}
      </div>

      <ul className="divide-y divide-border px-5 pb-6">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 py-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <VegMark veg={item.veg} />
                {item.bestseller ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                    <StarIcon className="h-3 w-3" />
                    Bestseller
                  </span>
                ) : null}
              </div>
              <h4 className="mt-1.5 text-base font-bold">{item.name}</h4>
              <p className="mt-0.5 font-semibold tabular-nums">{formatPaise(item.pricePaise)}</p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
            <div className="relative shrink-0 pb-4">
              <FoodImage src={item.image} alt={item.name} className="h-28 w-28 rounded-2xl sm:h-32 sm:w-32" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <AddControl restaurant={restaurant} item={item} controls={controls} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {cartCount > 0 ? (
        <div className="sticky bottom-0 border-t border-border bg-white/95 p-4 backdrop-blur">
          <button
            type="button"
            onClick={onOpenCart}
            className="flex w-full animate-slide-up items-center justify-between rounded-xl bg-success px-5 py-3.5 font-bold text-success-foreground shadow-lg transition hover:brightness-110"
          >
            <span className="tabular-nums">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} &middot; {formatPaise(cartSubtotalPaise)}
            </span>
            <span className="inline-flex items-center gap-2">
              View cart <BagIcon />
            </span>
          </button>
        </div>
      ) : null}
    </Modal>
  );
}