import type { ReactNode } from 'react';
import type { Route } from '@/lib/router';
import { cn } from '@/lib/utils';
import { BagIcon, HomeIcon, ReceiptIcon, SearchIcon, UserIcon } from './icons';

interface BottomNavProps {
  route: Route;
  cartCount: number;
  signedIn: boolean;
  onSearch: () => void;
  onOpenCart: () => void;
}

const ITEM_CLASS = 'relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition';

function NavLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <a href={href} aria-current={active ? 'page' : undefined} className={cn(ITEM_CLASS, active ? 'text-primary' : 'text-muted-foreground')}>
      {children}
      {label}
    </a>
  );
}

export function BottomNav({ route, cartCount, signedIn, onSearch, onOpenCart }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        <li>
          <NavLink href="#/" label="Home" active={route.name === 'home'}>
            <HomeIcon />
          </NavLink>
        </li>
        <li>
          <button type="button" onClick={onSearch} className={cn(ITEM_CLASS, 'text-muted-foreground')}>
            <SearchIcon />
            Search
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Cart, ${String(cartCount)} ${cartCount === 1 ? 'item' : 'items'}`}
            className={cn(ITEM_CLASS, 'text-muted-foreground')}
          >
            <BagIcon />
            Cart
            {cartCount > 0 ? (
              <span className="absolute left-1/2 top-2 ml-2 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white tabular-nums">
                {cartCount}
              </span>
            ) : null}
          </button>
        </li>
        <li>
          <NavLink href="#/orders" label="Orders" active={route.name === 'orders' || route.name === 'order'}>
            <ReceiptIcon />
          </NavLink>
        </li>
        <li>
          <NavLink
            href={signedIn ? '#/account' : '#/login'}
            label={signedIn ? 'Account' : 'Sign in'}
            active={route.name === 'account' || route.name === 'login'}
          >
            <UserIcon />
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}