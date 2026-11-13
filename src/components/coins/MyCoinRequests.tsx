import { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateTime, formatNumber } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { cardClass } from '@/lib/styles';
import type { CoinRequest } from '@/lib/types';

interface MyCoinRequestsProps {
  userId: string;
  version: number;
}

export default function MyCoinRequests({ userId, version }: MyCoinRequestsProps) {
  const [items, setItems] = useState<CoinRequest[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: loadError } = await supabase
        .from('coin_requests')
        .select('id, coins, amount_rs, transaction_id, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!active) return;
      if (loadError) {
        setError(true);
        return;
      }
      setError(false);
      setItems((data ?? []) as CoinRequest[]);
    })();
    return () => {
      active = false;
    };
  }, [userId, version]);

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-bold text-stone-900">Meri Requests</h2>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Requests load nahi ho sakin.
        </p>
      )}

      {items !== null && items.length === 0 && (
        <p className="mt-3 text-sm text-stone-600">Abhi tak koi request nahi bheji.</p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold text-stone-900">
                  {formatNumber(item.coins)} Coins{' '}
                  <span className="font-semibold text-stone-500">({formatNumber(item.amount_rs)} Rs)</span>
                </p>
                <p className="truncate text-sm text-stone-600">TXN: {item.transaction_id}</p>
                <p className="text-xs text-stone-500">{formatDateTime(item.created_at)}</p>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
