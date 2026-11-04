import type { ReactNode } from 'react';
import type { Category } from '@/data/catalog';
import { cn } from '@/lib/utils';
import { FoodImage } from './FoodImage';
import { SectionHeading } from './SectionHeading';

interface CategoryRailProps {
  categories: readonly Category[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

interface CategoryButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function CategoryButton({ label, active, onClick, children }: CategoryButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="group flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl p-1 sm:w-28"
    >
      <span
        className={cn(
          'block h-20 w-20 overflow-hidden rounded-full ring-[3px] ring-offset-2 transition duration-200 sm:h-24 sm:w-24',
          active ? 'scale-105 ring-primary' : 'ring-transparent group-hover:scale-105 group-hover:ring-border',
        )}
      >
        {children}
      </span>
      <span className={cn('text-sm font-semibold', active ? 'text-primary' : 'text-foreground/80')}>{label}</span>
    </button>
  );
}

export function CategoryRail({ categories, selected, onSelect }: CategoryRailProps) {
  return (
    <section aria-labelledby="categories-heading">
      <SectionHeading id="categories-heading" title="What's on your mind?" />
      <ul className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        <li>
          <CategoryButton
            label="All"
            active={selected === null}
            onClick={() => {
              onSelect(null);
            }}
          >
            <span className="grid h-full w-full place-items-center bg-accent text-lg font-black text-primary">ALL</span>
          </CategoryButton>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <CategoryButton
              label={category.label}
              active={selected === category.id}
              onClick={() => {
                onSelect(selected === category.id ? null : category.id);
              }}
            >
              <FoodImage src={category.image} alt="" className="h-full w-full" />
            </CategoryButton>
          </li>
        ))}
      </ul>
    </section>
  );
}