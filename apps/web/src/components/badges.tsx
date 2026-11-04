import { cn } from '@/lib/utils';
import { StarIcon } from './icons';

/** Veg / non-veg marker: shape and text label, not color alone. */
export function VegMark({ veg }: { veg: boolean }) {
  const label = veg ? 'Veg' : 'Non-veg';
  return (
    <span
      title={label}
      className={cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white',
        veg ? 'border-success' : 'border-destructive',
      )}
    >
      {veg ? (
        <span className="h-2 w-2 rounded-full bg-success" />
      ) : (
        <span className="h-0 w-0 border-x-4 border-b-[7px] border-x-transparent border-b-destructive" />
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function RatingBadge({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-rating px-1.5 py-0.5 text-xs font-bold text-rating-foreground tabular-nums">
      <StarIcon className="h-3 w-3" />
      {rating.toFixed(1)}
      <span className="sr-only"> out of 5</span>
    </span>
  );
}