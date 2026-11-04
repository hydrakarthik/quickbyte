export function Footer() {
  return (
    <footer className="bg-[#1c1c1c] text-white/80">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-2xl font-extrabold text-white">QuickByte</p>
            <p className="mt-2 max-w-sm text-sm">Fresh food from local kitchens, delivered fast.</p>
          </div>
          <p className="text-sm">Delivering in Koramangala, Indiranagar, HSR Layout and BTM Layout.</p>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-white/60">
          Prototype preview with sample restaurants and menus. Food photography from Unsplash.
        </p>
      </div>
    </footer>
  );
}