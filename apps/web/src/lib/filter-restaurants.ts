import type { Restaurant } from '@/data/catalog';

export type SortKey = 'relevance' | 'rating' | 'eta' | 'cost';

export interface FilterToggles {
  fast: boolean;
  minRating4: boolean;
  pureVeg: boolean;
  offers: boolean;
}

export interface RestaurantFilters extends FilterToggles {
  query: string;
  category: string | null;
  sort: SortKey;
}

export const FAST_DELIVERY_MINUTES = 30;

export const NO_TOGGLES: FilterToggles = { fast: false, minRating4: false, pureVeg: false, offers: false };

function matchesQuery(restaurant: Restaurant, query: string): boolean {
  const haystack = [
    restaurant.name,
    restaurant.area,
    ...restaurant.cuisines,
    ...restaurant.menu.map((item) => item.name),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function filterRestaurants(list: readonly Restaurant[], filters: RestaurantFilters): Restaurant[] {
  const query = filters.query.trim().toLowerCase();
  const result = list.filter((restaurant) => {
    if (filters.category !== null && !restaurant.categories.includes(filters.category)) return false;
    if (filters.fast && restaurant.etaMinutes > FAST_DELIVERY_MINUTES) return false;
    if (filters.minRating4 && restaurant.rating < 4) return false;
    if (filters.pureVeg && !restaurant.pureVeg) return false;
    if (filters.offers && restaurant.offer === null) return false;
    if (query !== '' && !matchesQuery(restaurant, query)) return false;
    return true;
  });

  switch (filters.sort) {
    case 'rating':
      return result.sort((a, b) => b.rating - a.rating);
    case 'eta':
      return result.sort((a, b) => a.etaMinutes - b.etaMinutes);
    case 'cost':
      return result.sort((a, b) => a.costForTwoPaise - b.costForTwoPaise);
    case 'relevance':
      return result;
  }
}