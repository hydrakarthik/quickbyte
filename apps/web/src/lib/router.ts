import { useMemo, useSyncExternalStore } from 'react';

/** Hash-based routes for the prototype. No router dependency needed. */
export type Route =
  | { name: 'home' }
  | { name: 'checkout' }
  | { name: 'orders' }
  | { name: 'order'; orderId: string }
  | { name: 'account' }
  | { name: 'login'; next: 'checkout' | null };

export function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [path = '', search = ''] = raw.split('?');
  const [first, second] = path.split('/').filter((segment) => segment !== '');

  if (first === 'checkout') return { name: 'checkout' };
  if (first === 'orders') return second ? { name: 'order', orderId: second } : { name: 'orders' };
  if (first === 'account') return { name: 'account' };
  if (first === 'login') {
    // Only known in-app targets are accepted, so `next` cannot redirect anywhere else.
    const next = new URLSearchParams(search).get('next') === 'checkout' ? 'checkout' : null;
    return { name: 'login', next };
  }
  // Anything else (including in-page anchors such as #restaurants) is the home page.
  return { name: 'home' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'checkout':
      return '#/checkout';
    case 'orders':
      return '#/orders';
    case 'order':
      return `#/orders/${encodeURIComponent(route.orderId)}`;
    case 'account':
      return '#/account';
    case 'login':
      return route.next ? `#/login?next=${route.next}` : '#/login';
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
  };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
  return useMemo(() => parseHash(hash), [hash]);
}