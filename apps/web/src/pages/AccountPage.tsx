import type { AccountState } from '@/account/account';
import { Avatar } from '@/components/Avatar';
import { MapPinIcon, ReceiptIcon, UserIcon } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { href } from '@/lib/router';

interface AccountPageProps {
  account: AccountState;
  orderCount: number;
  onSignOut: () => void;
}

export function AccountPage({ account, orderCount, onSignOut }: AccountPageProps) {
  const user = account.user;

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-accent text-primary">
          <UserIcon className="h-9 w-9" />
        </span>
        <h1 className="mt-6 text-2xl font-black">You are not signed in</h1>
        <p className="mt-2 text-muted-foreground">Sign in to save addresses and check out faster.</p>
        <a
          href={href({ name: 'login', next: null })}
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground"
        >
          Sign in or sign up
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <PageHeader backHref={href({ name: 'home' })} backLabel="Home" title="Your account" />

      <section aria-label="Profile" className="mt-6 flex items-center gap-4 rounded-3xl bg-linear-to-br from-primary to-[#7a240a] p-6 text-white shadow-md">
        <Avatar name={user.name} className="h-16 w-16 bg-white/20 bg-none text-xl ring-2 ring-white/40" />
        <div className="min-w-0">
          <p className="truncate text-2xl font-extrabold">{user.name}</p>
          <p className="truncate text-sm text-white/85">{user.email}</p>
          <p className="text-sm text-white/85">{user.phone ? `+91 ${user.phone}` : 'No mobile number added'}</p>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href={href({ name: 'orders' })}
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-foreground/30"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
            <ReceiptIcon />
          </span>
          <span>
            <span className="block font-bold">Your orders</span>
            <span className="block text-sm text-muted-foreground">
              {orderCount} {orderCount === 1 ? 'order' : 'orders'} placed
            </span>
          </span>
        </a>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
            <MapPinIcon />
          </span>
          <span>
            <span className="block font-bold">Saved addresses</span>
            <span className="block text-sm text-muted-foreground">{account.addresses.length} of 10 saved</span>
          </span>
        </div>
      </div>

      <section aria-labelledby="addresses-heading" className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <h2 id="addresses-heading" className="text-lg font-extrabold">
          Addresses
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {account.addresses.map((address) => (
            <li key={address.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div>
                <p className="font-bold">
                  {address.label}
                  {address.id === account.selectedAddressId ? (
                    <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-success">Default</span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {address.line1}, {address.area}, {address.city}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Add new addresses during checkout.</p>
      </section>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-6 min-h-12 w-full rounded-xl border border-border font-bold text-destructive transition hover:bg-red-50"
      >
        Sign out
      </button>
    </div>
  );
}