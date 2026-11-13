import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PAYMENT_SCREENSHOT_BUCKET } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { cardClass } from '@/lib/styles';
import type { AdminCoinRequest } from '@/lib/types';

interface CoinRequestsPanelProps {
  onChanged: () => Promise<void>;
}

const SIGNED_URL_SECONDS = 600;

function ScreenshotPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.storage
        .from(PAYMENT_SCREENSHOT_BUCKET)
        .createSignedUrl(path, SIGNED_URL_SECONDS);
      if (!active) return;
      if (error || !data) {
        setFailed(true);
        return;
      }
      setUrl(data.signedUrl);
    })();
    return () => {
      active = false;
    };
  }, [path]);

  if (failed) {
    return <p className="text-sm font-semibold text-red-700">Screenshot load nahi hua.</p>;
  }
  if (!url) {
    return <div className="h-40 w-full animate-pulse rounded-xl bg-stone-200" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-xl border border-stone-200">
      <img src={url} alt="Payment screenshot" className="max-h-72 w-full bg-stone-100 object-contain" />
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-800 shadow">
        <ExternalLink className="h-3 w-3" /> Bari Tasveer
      </span>
    </a>
  );
}

export default function CoinRequestsPanel({ onChanged }: CoinRequestsPanelProps) {
  const [items, setItems] = useState<AdminCoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc('admin_list_coin_requests', { p_status: 'pending' });
    if (loadError) {
      setError(getErrorMessage(loadError));
      return;
    }
    setError(null);
    setItems((data ?? []) as AdminCoinRequest[]);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, [load]);

  const review = async (item: AdminCoinRequest, approve: boolean) => {
    if (!approve && !window.confirm(`${item.user_name} ki ${formatNumber(item.coins)} Coins wali request reject karein?`)) {
      return;
    }
    setBusyId(item.request_id);
    setError(null);
    const { error: reviewError } = await supabase.rpc('admin_review_coin_request', {
      p_request_id: item.request_id,
      p_approve: approve,
    });
    setBusyId(null);
    if (reviewError) {
      setError(getErrorMessage(reviewError));
      await load();
      return;
    }
    setItems((prev) => (prev ? prev.filter((r) => r.request_id !== item.request_id) : prev));
    await onChanged();
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900">Pending Coin Requests</h2>
        <p className="text-sm text-stone-600">Payment check karke approve ya reject karein.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      {items === null && !error && <div className={`${cardClass} text-stone-500`}>Requests load ho rahi hain...</div>}

      {items !== null && items.length === 0 && (
        <div className={`${cardClass} text-center text-stone-600`}>Abhi koi pending request nahi hai.</div>
      )}

      {items?.map((item) => (
        <article key={item.request_id} className={`${cardClass} space-y-4 animate-fade-in`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-stone-900">{item.user_name}</p>
              <p className="text-sm text-stone-600">{item.user_mobile}</p>
            </div>
            <p className="text-xs text-stone-500">{formatDateTime(item.created_at)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4 text-sm">
            <div>
              <dt className="text-stone-600">Coins</dt>
              <dd className="font-bold text-stone-900">{formatNumber(item.coins)}</dd>
            </div>
            <div>
              <dt className="text-stone-600">Amount</dt>
              <dd className="font-bold text-stone-900">{formatNumber(item.amount_rs)} Rs</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-stone-600">Transaction ID</dt>
              <dd className="break-all font-bold text-stone-900">{item.transaction_id}</dd>
            </div>
          </dl>

          <ScreenshotPreview path={item.screenshot_path} />

          <div className="grid grid-cols-2 gap-3">
            <Button variant="primary" loading={busyId === item.request_id} disabled={busyId !== null} onClick={() => void review(item, true)}>
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button variant="danger" disabled={busyId !== null} onClick={() => void review(item, false)}>
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
