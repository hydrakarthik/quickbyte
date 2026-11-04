import { DEMO_ROUTE, pointAlong, toSvgPath, traveledPoints } from '@/orders/route-geometry';

const BLOCKS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 48, 50], [64, 0, 78, 50], [158, 0, 96, 50], [270, 0, 130, 50],
  [0, 66, 48, 76], [64, 66, 78, 26], [64, 106, 78, 36], [158, 66, 96, 24], [270, 66, 130, 84],
  [158, 106, 96, 36], [0, 158, 48, 40], [64, 158, 78, 50], [158, 158, 96, 50],
];

interface TrackingMapProps {
  progress: number;
  restaurantName: string;
  showRider: boolean;
}

export function TrackingMap({ progress, restaurantName, showRider }: TrackingMapProps) {
  const [x, y] = pointAlong(DEMO_ROUTE, progress);
  const start = DEMO_ROUTE[0] ?? [0, 0];
  const end = DEMO_ROUTE[DEMO_ROUTE.length - 1] ?? [0, 0];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Map showing the route from ${restaurantName} to your address`}
        className="h-full w-full"
      >
        <rect width="400" height="250" fill="#eef1ec" />
        {BLOCKS.map(([bx, by, bw, bh]) => (
          <rect key={`${String(bx)}-${String(by)}`} x={bx} y={by} width={bw} height={bh} rx="6" fill="#ffffff" opacity="0.85" />
        ))}
        <circle cx="330" cy="200" r="36" fill="#cfe8c9" />
        <path d="M0 226 C 80 206 130 244 210 230 S 330 206 400 220 L400 250 L0 250 Z" fill="#cde4f3" />
        <path
          d={toSvgPath(DEMO_ROUTE)}
          fill="none"
          className="stroke-primary"
          strokeOpacity="0.35"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 9"
        />
        <path
          d={toSvgPath(traveledPoints(DEMO_ROUTE, progress))}
          fill="none"
          className="stroke-primary transition-all duration-1000"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g transform={`translate(${String(start[0])} ${String(start[1])})`}>
          <circle r="13" fill="#ffffff" className="stroke-primary" strokeWidth="3" />
          <circle r="5" className="fill-primary" />
        </g>
        <g transform={`translate(${String(end[0])} ${String(end[1])})`}>
          <circle r="13" className="fill-success" stroke="#ffffff" strokeWidth="3" />
          <path d="M-5 1 0 -4 5 1 M-3.5 0 V5 H3.5 V0" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {showRider ? (
          <g style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`, transition: 'transform 1s linear' }}>
            <circle r="20" className="fill-brand" opacity="0.2" />
            <circle r="11" fill="#1c1c1c" stroke="#ffffff" strokeWidth="3" />
            <circle r="3.5" className="fill-brand" />
          </g>
        ) : null}
      </svg>
      <span className="absolute left-[14%] top-[78%] mt-4 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold shadow-md">
        {restaurantName}
      </span>
      <span className="absolute left-[86%] top-[23%] mt-4 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold shadow-md">
        You
      </span>
    </div>
  );
}