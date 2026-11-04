import { describe, expect, it } from 'vitest';
import { restaurants } from '@/data/catalog';
import { FAST_DELIVERY_MINUTES, filterRestaurants, type RestaurantFilters } from './filter-restaurants';

const base: RestaurantFilters = {
  query: '',
  category: null,
  sort: 'relevance',
  fast: false,
  minRating4: false,
  pureVeg: false,
  offers: false,
};

describe('filterRestaurants', () => {
  it('returns every restaurant when no filter is active', () => {
    expect(filterRestaurants(restaurants, base)).toHaveLength(restaurants.length);
  });

  it('matches dish names case-insensitively', () => {
    const ids = filterRestaurants(restaurants, { ...base, query: '  MASALA DOSA ' }).map((r) => r.id);
    expect(ids).toEqual(['dosa-express']);
  });

  it('filters by category', () => {
    const result = filterRestaurants(restaurants, { ...base, category: 'biryani' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.categories.includes('biryani'))).toBe(true);
  });

  it('combines toggles so every result satisfies all of them', () => {
    const result = filterRestaurants(restaurants, { ...base, fast: true, minRating4: true, pureVeg: true });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((r) => r.etaMinutes <= FAST_DELIVERY_MINUTES && r.rating >= 4 && r.pureVeg),
    ).toBe(true);
  });

  it('sorts by rating from high to low', () => {
    const ratings = filterRestaurants(restaurants, { ...base, sort: 'rating' }).map((r) => r.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it('does not mutate the source list when sorting', () => {
    const before = restaurants.map((r) => r.id);
    filterRestaurants(restaurants, { ...base, sort: 'eta' });
    expect(restaurants.map((r) => r.id)).toEqual(before);
  });
});