import type { Offer } from '@/data/catalog';
import { cn } from '@/lib/utils';
import { TagIcon } from './icons';
import { SectionHeading } from './SectionHeading';

export function OffersRow({ offers }: { offers: readonly Offer[] }) {
  return (
    <section id="offers" aria-labelledby="offers-heading" className="scroll-mt-28">
      <SectionHeading id="offers-heading" title="Offers for you" subtitle="Hand-picked deals from kitchens near you" />
      <ul className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:px-0">
        {offers.map((offer) => (
          <li
            key={offer.id}
            className={cn(
              'relative w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-linear-to-br p-5 text-white shadow-md transition hover:-translate-y-1 hover:shadow-xl md:w-auto',
              offer.gradient,
            )}
          >
            <TagIcon className="absolute -right-4 -top-4 h-28 w-28 text-white/15" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/85">Deal of the day</p>
            <p className="mt-2 text-2xl font-black leading-tight">{offer.title}</p>
            <p className="mt-1 text-sm text-white/90">{offer.subtitle}</p>
            <p className="mt-4 inline-flex rounded-lg border border-dashed border-white/60 bg-white/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider">
              {offer.code}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}