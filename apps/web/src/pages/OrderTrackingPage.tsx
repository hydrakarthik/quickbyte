import { useState } from 'react';
import { BillSummary } from '@/components/BillSummary';
import { VegMark } from '@/components/badges';
import { BikeIcon, CardIcon, CheckIcon, MapPinIcon, ReceiptIcon, StarIcon } from '@/components/icons';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { TrackingMap } from '@/components/TrackingMap';
import type { Restaurant } from '@/data/catalog';
import { formatDateTime, formatPaise, formatTime } from '@/lib/format';
import { href } from '@/lib/router';
import { cn } from '@/lib/utils';
import {
  DEMO_STAGES,
  isActive,
  minutesRemaining,
  riderFor,
  riderProgress,
  stageIndex,
  STATUS_HEADLINE,
  statusAt,
  type Order,
  type OrderRating,
} from '@/orders/orders';

const MAX_REVIEW = 1000;

interface OrderTrackingPageProps {
  order: Order | undefined;
  restaurant: Restaurant | undefined;
  now: number;
  onCancel: (orderId: string) => void;
  onRate: (orderId: string, rating: OrderRating) => void;
  onReorder: (order: Order) => void;
}

function StarInput({ name, label, value, onChange }: { name: string; label: string; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={score}
              checked={value === score}
              onChange={() => {
                onChange(score);
              }}
              className="peer sr-only"
            />
            <span className="block rounded-lg p-0.5 transition peer-focus-visible:outline-2 peer-focus-visible:outline-ring hover:scale-110">
              <StarIcon className={cn('h-8 w-8', score <= value ? 'text-amber-400' : 'text-border')} />
            </span>
            <span className="sr-only">
              {score} {score === 1 ? 'star' : 'stars'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RatingForm({ riderName, restaurantName, onSubmit }: { riderName: string; restaurantName: string; onSubmit: (rating: OrderRating) => void }) {
  const [restaurant, setRestaurant] = useState(0);
  const [driver, setDriver] = useState(0);
  const [review, setReview] = useState('');
  const ready = restaurant > 0 && driver > 0;

  return (
    <section aria-labelledby="rate-heading" className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 id="rate-heading" className="text-lg font-extrabold">
        How was your order?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Your ratings help other foodies choose.</p>
      <form
        className="mt-5 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onSubmit({ restaurant, driver, review: review.trim() });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <StarInput name="rate-restaurant" label={`Food from ${restaurantName}`} value={restaurant} onChange={setRestaurant} />
          <StarInput name="rate-driver" label={`Delivery by ${riderName}`} value={driver} onChange={setDriver} />
        </div>
        <div>
          <label htmlFor="rate-review" className="block text-sm font-semibold">
            Add a review <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="rate-review"
            value={review}
            onChange={(event) => {
              setReview(event.target.value.slice(0, MAX_REVIEW));
            }}
            rows={3}
            maxLength={MAX_REVIEW}
            aria-describedby="rate-review-count"
            className="mt-1.5 w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <p id="rate-review-count" className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
            {review.length}/{MAX_REVIEW}
          </p>
        </div>
        <button
          type="submit"
          disabled={!ready}
          className="min-h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit rating
        </button>
      </form>
    </section>
  );
}

export function OrderTrackingPage({ order, restaurant, now, onCancel, onRate, onReorder }: OrderTrackingPageProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!order) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-accent text-primary">
          <ReceiptIcon className="h-9 w-9" />
        </span>
        <h1 className="mt-6 text-2xl font-black">Order not found</h1>
        <p className="mt-2 text-muted-foreground">This order is not saved in this browser.</p>
        <a
          href={href({ name: 'orders' })}
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground"
        >
          See your orders
        </a>
      </div>
    );
  }

  const status = statusAt(order, now);
  const current = stageIndex(status);
  const active = isActive(status);
  const rider = riderFor(order.id);
  const riderAssigned = status === 'Ready_For_Pickup' || status === 'Picked_Up' || status === 'Delivered';
  const progress = status === 'Delivered' ? 1 : riderProgress(order, now);
  const minutes = minutesRemaining(order, now, restaurant?.etaMinutes ?? 30);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <PageHeader
        backHref={href({ name: 'orders' })}
        backLabel="Your orders"
        title={`Order #${order.id}`}
        subtitle={`${order.restaurantName} \u00b7 placed ${formatDateTime(order.placedAt)}`}
      />

      {active ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900">
          Demo tracking: this order moves through every stage automatically in about two minutes.
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section aria-labelledby="tracking-heading" className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
            <div
              className={cn(
                'px-5 py-5 text-white sm:px-6',
                status === 'Cancelled' ? 'bg-foreground' : status === 'Delivered' ? 'bg-success' : 'bg-linear-to-r from-primary to-[#9c2f0c]',
              )}
            >
              <h2 id="tracking-heading" className="text-2xl font-extrabold" aria-live="polite">
                {STATUS_HEADLINE[status]}
              </h2>
              {active ? (
                <p className="mt-1 text-white/90">
                  Arriving in <span className="font-extrabold tabular-nums">{minutes} min</span>
                </p>
              ) : status === 'Cancelled' ? (
                <p className="mt-1 text-white/85">Your payment authorization has been released (demo).</p>
              ) : null}
            </div>
            {status === 'Cancelled' ? null : (
              <div className="aspect-[8/5] bg-muted">
                <TrackingMap progress={progress} restaurantName={order.restaurantName} showRider={riderAssigned} />
              </div>
            )}
          </section>

          {riderAssigned ? (
            <section aria-label="Your delivery partner" className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-foreground text-white">
                <BikeIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {rider.firstName} is your delivery partner
                </p>
                <p className="text-sm text-muted-foreground">
                  {rider.vehicle} &middot; {rider.plate}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-rating px-2 py-1 text-sm font-bold text-rating-foreground">
                <StarIcon className="h-3.5 w-3.5" />
                {rider.rating.toFixed(1)}
              </span>
            </section>
          ) : null}

          <section aria-labelledby="progress-heading" className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <h2 id="progress-heading" className="text-lg font-extrabold">
              Order progress
            </h2>
            {status === 'Cancelled' && order.cancelledAt !== null ? (
              <p className="mt-3 text-sm text-muted-foreground">Cancelled at {formatTime(order.cancelledAt)}.</p>
            ) : (
              <ol className="mt-5">
                {DEMO_STAGES.map((stage, index) => {
                  const done = current >= index;
                  const isCurrent = current === index;
                  return (
                    <li key={stage.status} aria-current={isCurrent ? 'step' : undefined} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < DEMO_STAGES.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className={cn('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', current > index ? 'bg-success' : 'bg-border')}
                        />
                      ) : null}
                      <span
                        className={cn(
                          'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition',
                          done ? 'border-success bg-success text-white' : 'border-border bg-white text-muted-foreground',
                          isCurrent && active && 'ring-4 ring-success/20',
                        )}
                      >
                        {done ? <CheckIcon className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className={cn('font-bold', !done && 'text-muted-foreground')}>{stage.label}</p>
                        <p className="text-sm text-muted-foreground">{stage.detail}</p>
                        {done ? (
                          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                            {formatTime(order.placedAt + stage.atSeconds * 1000)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {status === 'Delivered' && order.rating === null ? (
            <RatingForm
              riderName={rider.firstName}
              restaurantName={order.restaurantName}
              onSubmit={(rating) => {
                onRate(order.id, rating);
              }}
            />
          ) : null}

          {order.rating ? (
            <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="font-bold text-success">Thanks for rating your order</p>
              <p className="mt-1 text-sm">
                Food {order.rating.restaurant}/5 &middot; Delivery {order.rating.driver}/5
              </p>
              {order.rating.review ? <p className="mt-2 text-sm italic text-muted-foreground">&ldquo;{order.rating.review}&rdquo;</p> : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <section aria-labelledby="details-heading" className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <h2 id="details-heading" className="text-lg font-extrabold">
              Order details
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <dt className="font-semibold">Deliver to {order.address.label}</dt>
                  <dd className="text-muted-foreground">
                    {order.address.line1}, {order.address.area}, {order.address.city}
                  </dd>
                  {order.instructions ? <dd className="mt-1 text-muted-foreground">Note: {order.instructions}</dd> : null}
                </div>
              </div>
              <div className="flex gap-3">
                <CardIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="font-semibold">Payment</dt>
                  <dd className="text-muted-foreground">{order.paymentLabel}</dd>
                </div>
              </div>
            </dl>

            <ul className="mt-5 space-y-3 border-t border-border pt-5">
              {order.lines.map((line) => (
                <li key={line.itemId} className="flex items-center gap-3 text-sm">
                  <VegMark veg={line.veg} />
                  <span className="min-w-0 flex-1">
                    {line.quantity} x {line.name}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPaise(line.pricePaise * line.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <BillSummary bill={order.bill} totalLabel={status === 'Cancelled' ? 'Total (released)' : 'Paid'} />
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {status === 'Placed' ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCancel(true);
                  }}
                  className="min-h-11 rounded-xl border border-destructive/40 font-bold text-destructive transition hover:bg-red-50"
                >
                  Cancel order
                </button>
              ) : null}
              {active ? null : (
                <button
                  type="button"
                  onClick={() => {
                    onReorder(order);
                  }}
                  className="min-h-11 rounded-xl bg-primary font-bold text-primary-foreground transition hover:brightness-110"
                >
                  Reorder
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={confirmCancel && status === 'Placed'}
        onClose={() => {
          setConfirmCancel(false);
        }}
        labelledBy="cancel-order-heading"
        variant="dialog"
      >
        <div className="p-6">
          <h2 id="cancel-order-heading" className="text-lg font-extrabold">
            Cancel this order?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The restaurant has not accepted it yet, so you will not be charged.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmCancel(false);
              }}
              className="min-h-11 rounded-xl border border-border font-bold transition hover:bg-muted"
            >
              Keep order
            </button>
            <button
              type="button"
              onClick={() => {
                onCancel(order.id);
                setConfirmCancel(false);
              }}
              className="min-h-11 rounded-xl bg-destructive font-bold text-destructive-foreground transition hover:brightness-110"
            >
              Cancel order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}