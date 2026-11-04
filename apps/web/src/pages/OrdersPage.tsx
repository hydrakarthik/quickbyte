import { ReceiptIcon } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { formatDateTime, formatPaise } from '@/lib/format';
import { href } from '@/lib/router';
import { isActive, statusAt, type Order } from '@/orders/orders';

interface OrdersPageProps {
  orders: readonly Order[];
  now: number;
  onReorder: (order: Order) => void;
}

export function OrdersPage({ orders, now, onReorder }: OrdersPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <PageHeader backHref={href({ name: 'home' })} backLabel="Home" title="Your orders" subtitle="Track live orders and reorder your favourites" />

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-border bg-muted/50 px-6 py-16 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-accent text-primary">
            <ReceiptIcon className="h-9 w-9" />
          </span>
          <p className="mt-5 text-lg font-bold">No orders yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">When you place an order, you can track it live from here.</p>
          <a
            href={href({ name: 'home' })}
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:brightness-110"
          >
            Find something tasty
          </a>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => {
            const status = statusAt(order, now);
            return (
              <li key={order.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{order.restaurantName}</p>
                    <p className="text-sm text-muted-foreground">
                      #{order.id} &middot; {formatDateTime(order.placedAt)}
                    </p>
                  </div>
                  <StatusChip status={status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {order.lines.map((line) => `${String(line.quantity)} x ${line.name}`).join(', ')}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="font-bold tabular-nums">{formatPaise(order.bill.totalPaise)}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onReorder(order);
                      }}
                      className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold transition hover:bg-muted"
                    >
                      Reorder
                    </button>
                    <a
                      href={href({ name: 'order', orderId: order.id })}
                      className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110"
                    >
                      {isActive(status) ? 'Track order' : 'View details'}
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}