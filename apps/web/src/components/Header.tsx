import type { Route } from '@/lib/router';
import { cn } from '@/lib/utils';
import { BagIcon, MapPinIcon, ReceiptIcon, SearchIcon, UserIcon } from './icons';

interface HeaderProps {
  route: Route;
  query: string;
  onQueryChange: (query: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  userName: string | null;
}

const NAV_LINK = 'inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 font-semibold transition hover:bg-muted';

export function Header({ route, query, onQueryChange, cartCount, onOpenCart, userName }: HeaderProps) {
  const ordersActive = route.name === 'orders' || route.name === 'order';
  const accountActive = route.name === 'account' || route.name === 'login';
  const firstName = userName?.split(' ')[0] ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:flex-nowrap md:px-6">
        <a href="#/" className="flex shrink-0 items-center gap-2 rounded-xl" aria-label="QuickByte home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-brand to-primary text-xl font-black text-white shadow-md shadow-primary/30">
            Q
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            Quick<span className="text-brand">Byte</span>
          </span>
        </a>

        <div className="hidden min-w-0 items-center gap-1.5 border-l border-border pl-4 xl:flex">
          <MapPinIcon className="h-5 w-5 shrink-0 text-brand" />
          <p className="truncate text-sm">
            <span className="font-bold">Home</span> <span className="text-muted-foreground">Koramangala, Bengaluru</span>
          </p>
        </div>

        <div className="relative order-last w-full md:order-none md:ml-auto md:max-w-md md:flex-1">
          <label htmlFor="site-search" className="sr-only">
            Search restaurants, cuisines or dishes
          </label>
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="site-search"
            type="search"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
            }}
            placeholder="Search for restaurants, cuisines or dishes"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-border bg-muted pl-11 pr-4 text-sm transition placeholder:text-muted-foreground focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 focus:outline-none"
          />
        </div>

        <nav aria-label="Account" className="hidden items-center gap-1 md:flex">
          <a href="#/orders" aria-current={ordersActive ? 'page' : undefined} aria-label="Your orders" className={cn(NAV_LINK, ordersActive && 'text-primary')}>
            <ReceiptIcon />
            <span className="hidden lg:inline">Orders</span>
          </a>
          <a
            href={userName ? '#/account' : '#/login'}
            aria-current={accountActive ? 'page' : undefined}
            aria-label={userName ? 'Your account' : 'Sign in'}
            className={cn(NAV_LINK, accountActive && 'text-primary')}
          >
            <UserIcon />
            <span className="hidden max-w-28 truncate lg:inline">{firstName ?? 'Sign in'}</span>
          </a>
        </nav>

        <button
          type="button"
          onClick={onOpenCart}
          aria-label={`Open cart, ${String(cartCount)} ${cartCount === 1 ? 'item' : 'items'}`}
          className={cn(NAV_LINK, 'relative ml-auto md:ml-0')}
        >
          <BagIcon className="h-6 w-6" />
          <span className="hidden lg:inline">Cart</span>
          {cartCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 animate-fade-in place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white tabular-nums">
              {cartCount}
            </span>
          ) : null}
        </button>
        <p className="sr-only" aria-live="polite">
          {`${String(cartCount)} ${cartCount === 1 ? 'item' : 'items'} in cart`}
        </p>
      </div>
    </header>
  );
}