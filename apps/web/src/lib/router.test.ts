import { describe, expect, it } from 'vitest';
import { href, parseHash, type Route } from './router';

describe('parseHash', () => {
  it('treats empty hashes and in-page anchors as home', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#restaurants')).toEqual({ name: 'home' });
  });

  it('parses order detail routes', () => {
    expect(parseHash('#/orders/QB12345')).toEqual({ name: 'order', orderId: 'QB12345' });
  });

  it('only accepts known login redirect targets', () => {
    expect(parseHash('#/login?next=checkout')).toEqual({ name: 'login', next: 'checkout' });
    expect(parseHash('#/login?next=https://evil.example')).toEqual({ name: 'login', next: null });
  });

  it('round-trips every route through href', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'checkout' },
      { name: 'orders' },
      { name: 'order', orderId: 'QBABC12' },
      { name: 'account' },
      { name: 'login', next: null },
      { name: 'login', next: 'checkout' },
    ];
    for (const route of routes) expect(parseHash(href(route))).toEqual(route);
  });
});