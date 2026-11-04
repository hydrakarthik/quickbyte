import { describe, expect, it } from 'vitest';
import { DEMO_ROUTE, pointAlong, routeLength, traveledPoints, type Point } from './route-geometry';

describe('route geometry', () => {
  const start = DEMO_ROUTE[0];
  const end = DEMO_ROUTE[DEMO_ROUTE.length - 1];

  it('starts at the restaurant and ends at the customer', () => {
    expect(pointAlong(DEMO_ROUTE, 0)).toEqual(start);
    expect(pointAlong(DEMO_ROUTE, 1)).toEqual(end);
  });

  it('clamps fractions outside 0..1', () => {
    expect(pointAlong(DEMO_ROUTE, -1)).toEqual(start);
    expect(pointAlong(DEMO_ROUTE, 2)).toEqual(end);
  });

  it('travels the requested share of the route', () => {
    for (const fraction of [0.1, 0.25, 0.5, 0.8]) {
      expect(routeLength(traveledPoints(DEMO_ROUTE, fraction))).toBeCloseTo(routeLength(DEMO_ROUTE) * fraction, 6);
    }
  });

  it('handles an empty route', () => {
    const empty: Point[] = [];
    expect(traveledPoints(empty, 0.5)).toEqual([]);
  });
});