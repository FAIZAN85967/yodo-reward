import { useCallback, useEffect, useState } from 'react';
import { Crown, RefreshCw, Trophy } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatNumber } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { cardClass } from '@/lib/styles';
import type { LeaderboardEntry } from '@/lib/types';

const REFRESH_MS = 30000;

const PODIUM_STYLES = [
  { label: '1st', crown: 'fill-amber-400 text-amber-500', ring: 'ring-amber-300', bar: 'h-32 bg-gradient-to-b from-amber-200 to-amber-400' },
  { label: '2nd', crown: 'fill-slate-300 text-slate-400', ring: 'ring-slate-300', bar: 'h-24 bg-gradient-to-b from-slate-100 to-slate-300' },
  { label: '3rd', crown: 'fill-orange-500 text-orange-700', ring: 'ring-orange-300', bar: 'h-20 bg-gradient-to-b from-orange-100 to-orange-300' },
] as const;

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc('get_weekly_leaderboard');
    if (loadError) {
      setError(true);
      return;
    }
    setError(false);
    setEntries((data ?? []) as LeaderboardEntry[]);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const top3 = entries?.filter((e) => e.rank <= 3) ?? [];
  const rest = entries?.filter((e) => e.rank > 3) ?? [];
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Is Hafte Ki Top List</h1>
          <p className="mt-1 text-sm text-stone-600">Har Monday ko leaderboard naye sire se shuru hota hai.</p>
        </div>
        <Button variant="secondary" onClick={() => void load()} className="shrink-0 px-3 py-2.5" aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Leaderboard load nahi ho saka. Dobara koshish karein.
        </p>
      )}

      {entries === null && !error && (
        <div className={`${cardClass} text-center text-stone-500`}>Leaderboard load ho raha hai...</div>
      )}

      {entries !== null && entries.length === 0 && (
        <div className={`${cardClass} flex flex-col items-center gap-3 py-10 text-center`}>
          <Trophy className="h-12 w-12 text-gold-500" />
          <p className="font-semibold text-stone-900">Is hafte abhi koi points nahi hain.</p>
          <p className="text-sm text-stone-600">Ludo khel ke pehle number par aayein!</p>
        </div>
      )}

      {top3.length > 0 && (
        <section className="grid grid-cols-3 items-end gap-3 pt-4 sm:gap-4">
          {podiumOrder.map((entry, column) => {
            if (!entry) return <div key={column} />;
            const style = PODIUM_STYLES[entry.rank - 1];
            return (
              <div key={entry.user_id} className="flex flex-col items-center animate-pop">
                <Crown className={`mb-1 h-8 w-8 sm:h-10 sm:w-10 ${style.crown}`} strokeWidth={2} />
                <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-extrabold text-stone-900 ring-4 sm:h-16 sm:w-16 ${style.ring}`}>
                  {entry.user_name.charAt(0).toUpperCase()}
                </div>
                <p className="mt-2 w-full truncate text-center text-sm font-bold text-stone-900">
                  {entry.user_name}{entry.is_me ? ' (Aap)' : ''}
                </p>
                <p className="text-xs font-semibold text-stone-600">{formatNumber(entry.points)} Points</p>
                <p className="text-xs font-semibold text-gold-700">{formatNumber(entry.coins)} Coins</p>
                <div className={`mt-2 flex w-full items-start justify-center rounded-t-2xl pt-3 text-lg font-extrabold text-stone-800 shadow-inner ${style.bar}`}>
                  {style.label}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {rest.length > 0 && (
        <section className={`${cardClass} divide-y divide-stone-100 p-0`}>
          {rest.map((entry) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 px-5 py-3.5 ${entry.is_me ? 'bg-emerald-50' : ''}`}
            >
              <span className="w-8 text-center text-sm font-bold text-stone-500">{entry.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-stone-900">
                {entry.user_name}{entry.is_me ? ' (Aap)' : ''}
              </span>
              <span className="text-right">
                <span className="block text-sm font-bold text-emerald-800">{formatNumber(entry.points)} Points</span>
                <span className="block text-xs font-semibold text-gold-700">{formatNumber(entry.coins)} Coins</span>
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
