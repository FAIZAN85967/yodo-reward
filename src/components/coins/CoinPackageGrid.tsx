import { Coins } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { CoinPackage } from '@/lib/types';

interface CoinPackageGridProps {
  packages: CoinPackage[];
  selectedId?: number | null;
  onSelect: (pkg: CoinPackage) => void;
}

export default function CoinPackageGrid({ packages, selectedId, onSelect }: CoinPackageGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {packages.map((pkg) => {
        const selected = pkg.id === selectedId;
        return (
          <button
            key={pkg.id}
            type="button"
            onClick={() => onSelect(pkg)}
            aria-pressed={selected}
            className={`group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition duration-200 last:col-span-2 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:last:col-span-1 ${
              selected
                ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-600/30'
                : 'border-stone-200 bg-white hover:border-emerald-300'
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                selected ? 'bg-emerald-700 text-white' : 'bg-gold-100 text-gold-700 group-hover:bg-gold-200'
              }`}
            >
              <Coins className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-stone-600">{formatNumber(pkg.rupees)} Rs</span>
              <span className="block text-xl font-extrabold text-stone-900">{formatNumber(pkg.coins)}</span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-500">Coins</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
