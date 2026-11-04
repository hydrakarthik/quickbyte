import type { FilterToggles, SortKey } from '@/lib/filter-restaurants';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, XIcon } from './icons';

const CHIPS: ReadonlyArray<{ key: keyof FilterToggles; label: string }> = [
  { key: 'fast', label: 'Fast delivery' },
  { key: 'minRating4', label: 'Ratings 4.0+' },
  { key: 'pureVeg', label: 'Pure Veg' },
  { key: 'offers', label: 'Offers' },
];

const SORTS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'relevance', label: 'Sort: Relevance' },
  { value: 'rating', label: 'Rating: high to low' },
  { value: 'eta', label: 'Delivery time' },
  { value: 'cost', label: 'Cost: low to high' },
];

interface FilterBarProps {
  toggles: FilterToggles;
  onToggle: (key: keyof FilterToggles) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

export function FilterBar({ toggles, onToggle, sort, onSortChange }: FilterBarProps) {
  return (
    <div className="no-scrollbar -mx-4 mt-5 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <label className="relative inline-flex shrink-0">
        <span className="sr-only">Sort restaurants</span>
        <select
          value={sort}
          onChange={(event) => {
            const next = SORTS.find((option) => option.value === event.target.value);
            if (next) onSortChange(next.value);
          }}
          className="h-10 cursor-pointer appearance-none rounded-full border border-border bg-white pl-4 pr-9 text-sm font-semibold shadow-sm transition hover:bg-muted"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      </label>
      {CHIPS.map((chip) => {
        const active = toggles[chip.key];
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onToggle(chip.key);
            }}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold shadow-sm transition',
              active ? 'border-primary bg-accent text-primary' : 'border-border bg-white hover:bg-muted',
            )}
          >
            {chip.label}
            {active ? <XIcon className="h-3.5 w-3.5" /> : null}
          </button>
        );
      })}
    </div>
  );
}