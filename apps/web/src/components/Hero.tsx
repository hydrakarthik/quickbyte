import { heroImages } from '@/data/catalog';
import { FoodImage } from './FoodImage';
import { ClockIcon, StarIcon } from './icons';

interface HeroProps {
  restaurantCount: number;
  averageEtaMinutes: number;
  averageRating: string;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs font-medium text-white/80">{label}</dt>
      <dd className="text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</dd>
    </div>
  );
}

export function Hero({ restaurantCount, averageEtaMinutes, averageRating }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-linear-to-br from-primary via-[#b8350e] to-[#7a240a] text-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-400/25 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:px-6 md:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/25">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            Now delivering in Koramangala
          </p>
          <h1 id="hero-heading" className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Hungry? Great food,
            <br />
            delivered in minutes.
          </h1>
          <p className="mt-5 max-w-md text-base text-white/90 sm:text-lg">
            Order from the best local kitchens and follow every bite from the pan to your door.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#restaurants"
              className="inline-flex min-h-12 items-center rounded-xl bg-white px-6 font-bold text-primary shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Order now
            </a>
            <a
              href="#offers"
              className="inline-flex min-h-12 items-center rounded-xl px-6 font-bold text-white ring-1 ring-white/40 transition hover:bg-white/10"
            >
              See offers
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/20 pt-6">
            <Stat value={`${String(restaurantCount)}+`} label="Restaurants" />
            <Stat value={`${String(averageEtaMinutes)} min`} label="Avg. delivery" />
            <Stat value={averageRating} label="Avg. rating" />
          </dl>
        </div>

        <div aria-hidden="true" className="relative mx-auto hidden aspect-square w-full max-w-md md:block">
          <div className="absolute inset-6 overflow-hidden rounded-full shadow-2xl ring-8 ring-white/15">
            <FoodImage src={heroImages.main} alt="" className="h-full w-full" />
          </div>
          <div className="absolute -left-2 top-8 h-28 w-28 overflow-hidden rounded-full shadow-xl ring-4 ring-white motion-safe:animate-float">
            <FoodImage src={heroImages.pizza} alt="" className="h-full w-full" />
          </div>
          <div className="absolute -right-2 bottom-24 h-24 w-24 overflow-hidden rounded-full shadow-xl ring-4 ring-white motion-safe:animate-float [animation-delay:1.2s]">
            <FoodImage src={heroImages.dessert} alt="" className="h-full w-full" />
          </div>
          <div className="absolute -left-4 bottom-10 flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 text-foreground shadow-2xl">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-green-100 text-success">
              <ClockIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">Arriving in 18 min</span>
              <span className="block text-xs text-muted-foreground">Your biryani is on the way</span>
            </span>
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-foreground shadow-xl">
            <StarIcon className="h-4 w-4 text-amber-500" />
            4.8 loved by foodies
          </div>
        </div>
      </div>
    </section>
  );
}