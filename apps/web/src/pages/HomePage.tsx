import { useMemo } from 'react';
import type { CartControls } from '@/cart/cart';
import { Bestsellers } from '@/components/Bestsellers';
import { CategoryRail } from '@/components/CategoryRail';
import { FilterBar } from '@/components/FilterBar';
import { Hero } from '@/components/Hero';
import { BikeIcon, SearchIcon } from '@/components/icons';
import { OffersRow } from '@/components/OffersRow';
import { RestaurantCard } from '@/components/RestaurantCard';
import { bestsellers, categories, offers, restaurants } from '@/data/catalog';
import { filterRestaurants, type FilterToggles, type SortKey } from '@/lib/filter-restaurants';
import { href } from '@/lib/router';
import { STATUS_LABEL, statusAt, type Order } from '@/orders/orders';

const AVERAGE_ETA = Math.round(restaurants.reduce((sum, r) => sum + r.etaMinutes, 0) / restaurants.length);
const AVERAGE_RATING = (restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length).toFixed(1);

interface HomePageProps {
  query: string;
  category: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  toggles: FilterToggles;
  onToggle: (key: keyof FilterToggles) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onClearFilters: () => void;
  controls: CartControls;
  onOpenRestaurant: (restaurantId: string) => void;
  liveOrder: Order | null;
  now: number;
}

export function HomePage({
  query,
  category,
  onCategoryChange,
  toggles,
  onToggle,
  sort,
  onSortChange,
  onClearFilters,
  controls,
  onOpenRestaurant,
  liveOrder,
  now,
}: HomePageProps) {
  const visibleRestaurants = useMemo(
    () => filterRestaurants(restaurants, { query, category, sort, ...toggles }),
    [query, category, sort, toggles],
  );

  const trimmedQuery = query.trim();
  const searching = trimmedQuery !== '';
  const hasActiveFilters = searching || category !== null || Object.values(toggles).some(Boolean);
  const categoryLabel = categories.find((c) => c.id === category)?.label;
  const heading = searching
    ? `Results for "${trimmedQuery}"`
    : categoryLabel
      ? `${categoryLabel} near you`
      : 'Top restaurants near you';

  return (
    <>
      {liveOrder ? (
        <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6">
          <a
            href={href({ name: 'order', orderId: liveOrder.id })}
            className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-3 pr-4 transition hover:bg-green-100"
          >
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-white">
              <BikeIcon className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-ping rounded-full bg-success" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                {STATUS_LABEL[statusAt(liveOrder, now)]}: {liveOrder.restaurantName}
              </span>
              <span className="block text-xs text-muted-foreground">Track your order live</span>
            </span>
            <span className="text-sm font-bold text-success">Track</span>
          </a>
        </div>
      ) : null}

      {searching ? null : (
        <div className={liveOrder ? 'mt-4' : undefined}>
          <Hero restaurantCount={restaurants.length} averageEtaMinutes={AVERAGE_ETA} averageRating={AVERAGE_RATING} />
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-12 px-4 pt-8 md:px-6 md:pt-12">
        {searching ? null : (
          <>
            <OffersRow offers={offers} />
            <CategoryRail categories={categories} selected={category} onSelect={onCategoryChange} />
            <Bestsellers picks={bestsellers} controls={controls} onOpenRestaurant={onOpenRestaurant} />
          </>
        )}

        <section id="restaurants" aria-labelledby="restaurants-heading" className="scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="restaurants-heading" className="text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
                {heading}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {visibleRestaurants.length} {visibleRestaurants.length === 1 ? 'restaurant' : 'restaurants'} delivering to
                Koramangala
              </p>
            </div>
            {hasActiveFilters ? (
              <button type="button" onClick={onClearFilters} className="min-h-11 text-sm font-bold text-primary hover:underline">
                Clear all filters
              </button>
            ) : null}
          </div>

          <FilterBar toggles={toggles} onToggle={onToggle} sort={sort} onSortChange={onSortChange} />

          {visibleRestaurants.length > 0 ? (
            <ul className="mt-7 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRestaurants.map((restaurant) => (
                <li key={restaurant.id}>
                  <RestaurantCard restaurant={restaurant} onOpen={onOpenRestaurant} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-primary">
                <SearchIcon className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold">No restaurants match</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try a different dish or cuisine, or clear your filters to see everything nearby.
              </p>
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-6 min-h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:brightness-110"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}