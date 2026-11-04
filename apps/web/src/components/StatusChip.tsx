import { isActive, STATUS_LABEL, type OrderStatus } from '@/orders/orders';
import { cn } from '@/lib/utils';

export function StatusChip({ status }: { status: OrderStatus }) {
  const active = isActive(status);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        status === 'Delivered' && 'bg-green-50 text-success',
        status === 'Cancelled' && 'bg-red-50 text-destructive',
        active && 'bg-accent text-primary',
      )}
    >
      {active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}