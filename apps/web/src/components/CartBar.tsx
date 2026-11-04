import { formatPaise } from '@/lib/format';
import { BagIcon } from './icons';

interface CartBarProps {
  count: number;
  subtotalPaise: number;
  restaurantName: string;
  onOpen: () => void;
}

export function CartBar({ count, subtotalPaise, restaurantName, onOpen }: CartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-20 animate-slide-up p-3 md:inset-x-auto md:bottom-6 md:right-6 md:w-[26rem] md:p-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-4 rounded-2xl bg-success px-5 py-3.5 text-left text-success-foreground shadow-2xl shadow-green-900/30 transition hover:brightness-110"
      >
        <span className="min-w-0">
          <span className="block text-sm font-extrabold tabular-nums">
            {count} {count === 1 ? 'item' : 'items'} added
          </span>
          <span className="block truncate text-xs text-white/90">From {restaurantName}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-extrabold tabular-nums">
          {formatPaise(subtotalPaise)}
          <span aria-hidden="true">&middot;</span>
          View cart
          <BagIcon />
        </span>
      </button>
    </div>
  );
}