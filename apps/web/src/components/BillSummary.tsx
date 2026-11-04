import type { Bill } from '@/cart/cart';
import { formatPaise } from '@/lib/format';

function BillRow({ label, valuePaise, freeWhenZero = false }: { label: string; valuePaise: number; freeWhenZero?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {freeWhenZero && valuePaise === 0 ? <span className="text-success">FREE</span> : formatPaise(valuePaise)}
      </dd>
    </div>
  );
}

export function BillSummary({ bill, totalLabel = 'To pay' }: { bill: Bill; totalLabel?: string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Bill details</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <BillRow label="Item total" valuePaise={bill.itemTotalPaise} />
        <BillRow label="Delivery fee" valuePaise={bill.deliveryFeePaise} freeWhenZero />
        <BillRow label="Platform fee" valuePaise={bill.platformFeePaise} />
        <BillRow label="GST and restaurant charges" valuePaise={bill.taxesPaise} />
        <div className="flex justify-between border-t border-dashed border-foreground/20 pt-3 text-base font-extrabold">
          <dt>{totalLabel}</dt>
          <dd className="tabular-nums">{formatPaise(bill.totalPaise)}</dd>
        </div>
      </dl>
    </div>
  );
}