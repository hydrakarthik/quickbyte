import type { Restaurant } from '@/data/catalog';
import { deliveryLabel, formatPaise } from '@/lib/format';
import { RatingBadge } from './badges';
import { FoodImage } from './FoodImage';
import { ClockIcon } from './icons';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onOpen: (restaurantId: string) => void;
}

export function RestaurantCard({ restaurant, onOpen }: RestaurantCardProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(restaurant.id);
      }}
      className="group block w-full rounded-2xl text-left transition-transform duration-200 hover:scale-[0.98]"
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-sm">
        <FoodImage
          src={restaurant.image}
          alt={restaurant.name}
          className="h-full w-full transition duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-4 pb-3 pt-14">
          {restaurant.offer ? (
            <span className="block text-lg font-black uppercase leading-tight tracking-tight text-white drop-shadow">
              {restaurant.offer}
            </span>
          ) : null}
        </span>
        {restaurant.pureVeg ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-success shadow">
            PURE VEG
          </span>
        ) : null}
      </span>
      <span className="mt-3 block px-1">
        <span className="block truncate text-lg font-bold">{restaurant.name}</span>
        <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
          <RatingBadge rating={restaurant.rating} />
          <span aria-hidden="true" className="text-muted-foreground">
            &middot;
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            {restaurant.etaMinutes}-{restaurant.etaMinutes + 5} mins
          </span>
        </span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">{restaurant.cuisines.join(', ')}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {restaurant.area} &middot; {restaurant.distanceKm.toFixed(1)} km &middot; {deliveryLabel(restaurant.deliveryFeePaise)}{' '}
          &middot; {formatPaise(restaurant.costForTwoPaise)} for two
        </span>
      </span>
    </button>
  );
}