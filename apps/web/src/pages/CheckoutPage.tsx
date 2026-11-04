import { useState, type ReactNode } from 'react';
import { ADDRESS_LABELS, MAX_ADDRESSES, SERVICE_AREAS, type AccountState, type Address, type AddressLabel, type ServiceArea } from '@/account/account';
import { cardBrand, hasErrors, validateAddress, validateCard, type CardInput, type FieldErrors } from '@/account/validation';
import type { Bill, CartControls, CartState } from '@/cart/cart';
import { AddControl } from '@/components/AddControl';
import { Avatar } from '@/components/Avatar';
import { VegMark } from '@/components/badges';
import { BillSummary } from '@/components/BillSummary';
import { FoodImage } from '@/components/FoodImage';
import { BagIcon, CardIcon, CheckIcon, LockIcon, MapPinIcon, PlusIcon } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { TextField } from '@/components/TextField';
import type { Restaurant } from '@/data/catalog';
import { formatPaise } from '@/lib/format';
import { href } from '@/lib/router';
import { cn } from '@/lib/utils';

export interface PlaceOrderDetails {
  address: Address;
  instructions: string;
  paymentLabel: string;
}

interface CheckoutPageProps {
  cart: CartState;
  restaurant: Restaurant | null;
  bill: Bill;
  controls: CartControls;
  account: AccountState;
  onAddAddress: (address: Address) => void;
  onSelectAddress: (addressId: string) => void;
  onPlaceOrder: (details: PlaceOrderDetails) => void;
}

const EMPTY_CARD: CardInput = { number: '', expiry: '', cvc: '', name: '' };
const SAVED_CARD_LABEL = 'Visa ending 4242 (demo card)';
const MAX_INSTRUCTIONS = 300;
const PRIMARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition hover:brightness-110';
const SECONDARY_BUTTON = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 font-bold transition hover:bg-muted';
const OPTION_CARD =
  'flex cursor-pointer gap-3 rounded-xl border border-border p-4 transition hover:border-foreground/30 has-checked:border-primary has-checked:bg-accent/60';

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function Step({ number, title, done, children }: { number: number; title: string; done: boolean; children: ReactNode }) {
  const headingId = `checkout-step-${String(number)}`;
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white',
            done ? 'bg-success' : 'bg-foreground',
          )}
        >
          {done ? <CheckIcon className="h-4 w-4" /> : number}
        </span>
        <h2 id={headingId} className="text-lg font-extrabold">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function CheckoutPage({
  cart,
  restaurant,
  bill,
  controls,
  account,
  onAddAddress,
  onSelectAddress,
  onPlaceOrder,
}: CheckoutPageProps) {
  const [instructions, setInstructions] = useState('');
  const [payment, setPayment] = useState<'saved' | 'new'>('saved');
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState<FieldErrors<keyof CardInput>>({});
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState<AddressLabel>('Home');
  const [addressLine, setAddressLine] = useState('');
  const [addressArea, setAddressArea] = useState<ServiceArea>('Koramangala');
  const [addressErrors, setAddressErrors] = useState<FieldErrors<'line1'>>({});
  const [placing, setPlacing] = useState(false);

  if (cart.lines.length === 0 || !restaurant) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-accent text-primary">
          <BagIcon className="h-10 w-10" />
        </span>
        <h1 className="mt-6 text-2xl font-black">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add a few dishes and come back here to check out.</p>
        <a href={href({ name: 'home' })} className={cn(PRIMARY_BUTTON, 'mt-6')}>
          Browse restaurants
        </a>
      </div>
    );
  }

  const user = account.user;
  const selectedAddress = account.addresses.find((address) => address.id === account.selectedAddressId) ?? null;
  const blocker = user === null ? 'Sign in to place your order' : selectedAddress === null ? 'Add a delivery address' : null;

  function saveAddress() {
    const errors = validateAddress({ line1: addressLine });
    setAddressErrors(errors);
    if (hasErrors(errors)) {
      document.getElementById('address-line1')?.focus();
      return;
    }
    onAddAddress({
      id: `addr-${crypto.randomUUID()}`,
      label: addressLabel,
      line1: addressLine.trim(),
      area: addressArea,
      city: 'Bengaluru',
    });
    setAddingAddress(false);
    setAddressLine('');
  }

  function placeOrder() {
    if (!user || !selectedAddress || placing) return;
    let paymentLabel = SAVED_CARD_LABEL;
    if (payment === 'new') {
      const errors = validateCard(card, new Date());
      setCardErrors(errors);
      const firstInvalid = Object.keys(errors)[0];
      if (firstInvalid) {
        document.getElementById(`card-${firstInvalid}`)?.focus();
        return;
      }
      const digits = card.number.replace(/\D/g, '');
      paymentLabel = `${cardBrand(digits)} ending ${digits.slice(-4)}`;
    }
    setPlacing(true);
    const address = selectedAddress;
    const note = instructions.trim();
    // Simulated payment authorization delay; real authorization arrives with the payments phase.
    window.setTimeout(() => {
      onPlaceOrder({ address, instructions: note, paymentLabel });
    }, 1400);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <PageHeader backHref={href({ name: 'home' })} backLabel="Continue shopping" title="Checkout" subtitle={`Ordering from ${restaurant.name}`} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Step number={1} title="Account" done={user !== null}>
            {user ? (
              <div className="flex items-center gap-3">
                <Avatar name={user.name} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-xl bg-accent p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">Sign in or create an account to place your order. Your cart is saved.</p>
                <a href={href({ name: 'login', next: 'checkout' })} className={PRIMARY_BUTTON}>
                  Sign in or sign up
                </a>
              </div>
            )}
          </Step>

          <Step number={2} title="Delivery address" done={selectedAddress !== null}>
            {user === null ? (
              <p className="text-sm text-muted-foreground">Sign in to choose a saved address.</p>
            ) : (
              <>
                <fieldset>
                  <legend className="sr-only">Saved addresses</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {account.addresses.map((address) => (
                      <label key={address.id} className={OPTION_CARD}>
                        <input
                          type="radio"
                          name="delivery-address"
                          value={address.id}
                          checked={address.id === account.selectedAddressId}
                          onChange={() => {
                            onSelectAddress(address.id);
                          }}
                          className="mt-1 h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-bold">
                            <MapPinIcon className="h-4 w-4 text-brand" />
                            {address.label}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {address.line1}, {address.area}, {address.city}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {addingAddress ? (
                  <div className="mt-4 space-y-4 rounded-xl border border-dashed border-border p-4">
                    <fieldset>
                      <legend className="text-sm font-semibold">Save as</legend>
                      <div className="mt-2 flex gap-2">
                        {ADDRESS_LABELS.map((label) => (
                          <button
                            key={label}
                            type="button"
                            aria-pressed={addressLabel === label}
                            onClick={() => {
                              setAddressLabel(label);
                            }}
                            className={cn(
                              'min-h-10 rounded-full border px-4 text-sm font-semibold transition',
                              addressLabel === label ? 'border-primary bg-accent text-primary' : 'border-border hover:bg-muted',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <TextField
                      id="address-line1"
                      label="Flat, building and street"
                      value={addressLine}
                      onChange={setAddressLine}
                      error={addressErrors.line1}
                      autoComplete="street-address"
                      placeholder="e.g. Flat 12, Lake View Residency, 6th Cross"
                    />
                    <div>
                      <label htmlFor="address-area" className="block text-sm font-semibold">
                        Area
                      </label>
                      <select
                        id="address-area"
                        value={addressArea}
                        onChange={(event) => {
                          const area = SERVICE_AREAS.find((option) => option === event.target.value);
                          if (area) setAddressArea(area);
                        }}
                        aria-describedby="address-area-hint"
                        className="mt-1.5 h-12 w-full rounded-xl border border-border bg-white px-4 text-sm"
                      >
                        {SERVICE_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                      <p id="address-area-hint" className="mt-1.5 text-xs text-muted-foreground">
                        QuickByte currently delivers to these Bengaluru areas.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={saveAddress} className={PRIMARY_BUTTON}>
                        Save address
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingAddress(false);
                          setAddressErrors({});
                        }}
                        className={SECONDARY_BUTTON}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : account.addresses.length < MAX_ADDRESSES ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingAddress(true);
                    }}
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add new address
                  </button>
                ) : null}

                <div className="mt-5">
                  <label htmlFor="delivery-instructions" className="block text-sm font-semibold">
                    Delivery instructions <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id="delivery-instructions"
                    value={instructions}
                    onChange={(event) => {
                      setInstructions(event.target.value.slice(0, MAX_INSTRUCTIONS));
                    }}
                    maxLength={MAX_INSTRUCTIONS}
                    rows={2}
                    placeholder="e.g. Ring the bell twice, leave at the door"
                    aria-describedby="delivery-instructions-count"
                    className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                  <p id="delivery-instructions-count" className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                    {instructions.length}/{MAX_INSTRUCTIONS}
                  </p>
                </div>
              </>
            )}
          </Step>

          <Step number={3} title="Payment" done={false}>
            <fieldset>
              <legend className="sr-only">Payment method</legend>
              <div className="space-y-3">
                <label className={cn(OPTION_CARD, 'items-center')}>
                  <input
                    type="radio"
                    name="payment-method"
                    checked={payment === 'saved'}
                    onChange={() => {
                      setPayment('saved');
                    }}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <span aria-hidden="true" className="grid h-9 w-12 shrink-0 place-items-center rounded-md bg-[#1a1f71] text-xs font-black italic text-white">
                    VISA
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">Visa ending 4242</span>
                    <span className="block text-xs text-muted-foreground">Demo saved card</span>
                  </span>
                </label>
                <label className={cn(OPTION_CARD, 'items-center')}>
                  <input
                    type="radio"
                    name="payment-method"
                    checked={payment === 'new'}
                    onChange={() => {
                      setPayment('new');
                    }}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <CardIcon className="h-6 w-6 shrink-0 text-muted-foreground" />
                  <span className="font-bold">Add a new card</span>
                </label>
              </div>
            </fieldset>

            {payment === 'new' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField
                    id="card-number"
                    label="Card number"
                    value={card.number}
                    onChange={(value) => {
                      setCard((current) => ({ ...current, number: formatCardNumber(value) }));
                    }}
                    error={cardErrors.number}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                  />
                </div>
                <TextField
                  id="card-expiry"
                  label="Expiry (MM/YY)"
                  value={card.expiry}
                  onChange={(value) => {
                    setCard((current) => ({ ...current, expiry: formatExpiry(value) }));
                  }}
                  error={cardErrors.expiry}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="08/29"
                />
                <TextField
                  id="card-cvc"
                  label="CVV"
                  type="password"
                  value={card.cvc}
                  onChange={(value) => {
                    setCard((current) => ({ ...current, cvc: value.replace(/\D/g, '').slice(0, 4) }));
                  }}
                  error={cardErrors.cvc}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                />
                <div className="sm:col-span-2">
                  <TextField
                    id="card-name"
                    label="Name on card"
                    value={card.name}
                    onChange={(value) => {
                      setCard((current) => ({ ...current, name: value }));
                    }}
                    error={cardErrors.name}
                    autoComplete="cc-name"
                  />
                </div>
              </div>
            ) : null}

            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <LockIcon className="h-4 w-4 shrink-0" />
              Demo only. Card details stay on this page and are never saved or sent anywhere. Real payments will go through a
              PCI-compliant payment processor.
            </p>
          </Step>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <FoodImage src={restaurant.image} alt="" className="h-14 w-14 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate font-bold">{restaurant.name}</p>
                <p className="text-sm text-muted-foreground">
                  Delivery in {restaurant.etaMinutes}-{restaurant.etaMinutes + 5} mins
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-4">
              {cart.lines.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-center gap-3">
                  <VegMark veg={item.veg} />
                  <p className="min-w-0 flex-1 text-sm font-semibold">{item.name}</p>
                  <AddControl restaurant={restaurant} item={item} controls={controls} />
                  <p className="w-14 text-right text-sm font-bold tabular-nums">{formatPaise(item.pricePaise * quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <BillSummary bill={bill} />
            </div>

            <button
              type="button"
              onClick={placeOrder}
              disabled={blocker !== null || placing}
              className="mt-5 flex min-h-14 w-full items-center justify-between rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {placing ? (
                <span className="mx-auto inline-flex items-center gap-2">
                  <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Authorizing payment
                </span>
              ) : (
                <>
                  <span className="tabular-nums">{formatPaise(bill.totalPaise)}</span>
                  <span>Place order</span>
                </>
              )}
            </button>
            <p className="sr-only" aria-live="assertive">
              {placing ? 'Placing your order' : ''}
            </p>
            {blocker ? <p className="mt-2 text-center text-xs font-semibold text-destructive">{blocker}</p> : null}
            <p className="mt-3 text-center text-xs text-muted-foreground">Prototype: no real payment is taken.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}