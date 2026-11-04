import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-12 w-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand to-primary text-base font-extrabold text-white',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}