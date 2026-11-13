import { useCallback, useEffect, useState } from 'react';
import { Crown, Send, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { formatDate, formatNumber } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { cardClass } from '@/lib/styles';
import type { WeeklyWinner } from '@/lib/types';

const CROWN_STYLES = ['fill-amber-400 text-amber-500', 'fill-slate-300 text-slate-400', 'fill-orange-500 text-orange-700'] as const;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function WeeklyWinnersPanel() {
  const [winners, setWinners] = useState<WeeklyWinner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc('admin_weekly_winners');
    if (loadError) {
      setError(getErrorMessage(loadError));
      return;
    }
    setError(null);
    setWinners((data ?? []) as WeeklyWinner[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markPaid = async (winner: WeeklyWinner) => {
    setBusyUserId(winner.user_id);
    setError(null);
    const { error: payError } = await supabase.rpc('admin_mark_prize_paid', {
      p_week_start: winner.week_start,
      p_user_id: winner.user_id,
    });
    setBusyUserId(null);
    if (payError) setError(getErrorMessage(payError));
    await load();
  };

  const weekLabel = winners && winners.length > 0
    ? (() => {
        const start = new Date(winners[0].week_start);
        return `${formatDate(start.toISOString())} - ${formatDate(new Date(start.getTime() + WEEK_MS - 1).toISOString())}`;
      })()
    : null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900">Pichle Hafte Ke Winners</h2>
        {weekLabel && <p className="text-sm text-stone-600">Hafta: {weekLabel}</p>}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {winners === null && !error && <div className={`${cardClass} text-stone-500`}>Winners load ho rahe hain...</div>}

      {winners !== null && winners.length === 0 && (
        <div className={`${cardClass} text-center text-stone-600`}>Pichle hafte ka koi winner nahi hai.</div>
      )}

      {winners?.map((w) => (
        <article key={w.user_id} className={`${cardClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-4">
            <Crown className={`h-9 w-9 shrink-0 ${CROWN_STYLES[w.place - 1]}`} strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-600">{w.place === 1 ? '1st' : w.place === 2 ? '2nd' : '3rd'} Inam</p>
              <p className="truncate text-lg font-bold text-stone-900">{w.user_name}</p>
              <p className="text-sm text-stone-600">{w.user_mobile} | {formatNumber(w.points)} Points</p>
              <p className="text-base font-extrabold text-emerald-800">{formatNumber(w.prize_rs)} Rs</p>
            </div>
          </div>

          {w.paid ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> Bhej Diya Gaya
            </span>
          ) : (
            <Button variant="gold" loading={busyUserId === w.user_id} disabled={busyUserId !== null} onClick={() => void markPaid(w)}>
              <Send className="h-4 w-4" /> Prize Bhej Diya
            </Button>
          )}
        </article>
      ))}
    </section>
  );
}
