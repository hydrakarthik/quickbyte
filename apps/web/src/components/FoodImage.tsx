import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PlateIcon } from './icons';

interface FoodImageProps {
  src: string;
  alt: string;
  className?: string;
}

/** Lazy-loaded food photo with a branded placeholder if the image cannot load. */
export function FoodImage({ src, alt, className }: FoodImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={cn(
          'flex items-center justify-center bg-linear-to-br from-orange-100 via-amber-50 to-rose-100 text-brand',
          className,
        )}
      >
        <PlateIcon className="h-1/3 max-h-12 w-1/3 max-w-12 opacity-60" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(true);
      }}
      className={cn('bg-muted object-cover', className)}
    />
  );
}