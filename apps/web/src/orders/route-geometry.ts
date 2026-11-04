export type Point = readonly [number, number];

/** Rider route on the stylised tracking map (SVG viewBox 0 0 400 250). */
export const DEMO_ROUTE: readonly Point[] = [
  [56, 196],
  [56, 150],
  [150, 150],
  [150, 98],
  [262, 98],
  [262, 58],
  [344, 58],
];

function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function routeLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) total += distance(a, b);
  }
  return total;
}

/** Points from the start up to the position at `fraction` (0..1) of the route length. */
export function traveledPoints(points: readonly Point[], fraction: number): Point[] {
  const first = points[0];
  if (!first) return [];
  const target = routeLength(points) * Math.min(1, Math.max(0, fraction));
  const result: Point[] = [first];
  let walked = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) break;
    const length = distance(a, b);
    if (walked + length >= target) {
      const t = length === 0 ? 0 : (target - walked) / length;
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      return result;
    }
    walked += length;
    result.push(b);
  }
  return result;
}

export function pointAlong(points: readonly Point[], fraction: number): Point {
  return traveledPoints(points, fraction).at(-1) ?? points[0] ?? [0, 0];
}

export function toSvgPath(points: readonly Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}