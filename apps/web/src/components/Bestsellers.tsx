import type { CartControls } from '@/cart/cart';
import type { DishPick } from '@/data/catalog';
import { formatPaise } from '@/lib/format';
import { AddControl } from './AddControl';
import { VegMark } from './badges';
import { FoodImage } from './FoodImage';
import { SectionHeading } from './SectionHeading';

interface BestsellersProps {
  picks: readonly DishPick[];
  controls: CartControls;
  onOpenRestaurant: (restaurantId: string) => void;
}

export function Bestsellers({ picks, controls, onOpenRestaurant }: BestsellersProps) {
  return (
    <section aria-labelledby="bestsellers-heading">
      <SectionHeading id="bestsellers-heading" title="Bestsellers near you" subtitle="The dishes everyone in Koramangala is ordering" />
      <ul className="no-scrollbar -mx-4 mt-5 flex snap-x gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {picks.map(({ restaurant, item }) => (
          <li key={item.id} className="w-56 shrink-0 snap-start sm:w-60">
            <div className="relative">
              <FoodImage src={item.image} alt={item.name} className="aspect-[4/3] w-full rounded-2xl shadow-sm" />
              <span className="absolute left-2 top-2 rounded-md bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow">
                Bestseller
              </span>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                <AddControl restaurant={restaurant} item={item} controls={controls} />
              </div>
            </div>
            <div className="mt-8 px-1">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">
                  <VegMark veg={item.veg} />
                </span>
                <h3 className="line-clamp-1 font-bold leading-snug">{item.name}</h3>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenRestaurant(restaurant.id);
                  }}
                  className="truncate text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {restaurant.name}
                </button>
                <span className="shrink-0 font-bold tabular-nums">{formatPaise(item.pricePaise)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}