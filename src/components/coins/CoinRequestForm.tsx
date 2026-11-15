import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { MAX_SCREENSHOT_BYTES, PAYMENT_SCREENSHOT_BUCKET } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { cardClass, inputClass, labelClass } from '@/lib/styles';
import type { CoinPackage } from '@/lib/types';

interface CoinRequestFormProps {
  userId: string;
  pkg: CoinPackage;
}

const TXN_MIN = 4;
const TXN_MAX = 40;

function buildScreenshotPath(userId: string, file: File): string {
  const ext = (file.name.split('.').pop() ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  return `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

export default function CoinRequestForm({ userId, pkg }: CoinRequestFormProps) {
  const [transactionId, setTransactionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (selected: File | undefined) => {
    setError(null);
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('Sirf image (photo) upload karein.');
      return;
    }
    if (selected.size > MAX_SCREENSHOT_BYTES) {
      setError('Screenshot 5 MB se chota hona chahiye.');
      return;
    }
    setFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const cleanTxn = transactionId.trim();
    if (cleanTxn.length < TXN_MIN || cleanTxn.length > TXN_MAX) {
      setError(`Transaction ID ${TXN_MIN} se ${TXN_MAX} characters ka ho.`);
      return;
    }
    if (!file) {
      setError('Payment ka screenshot upload karein.');
      return;
    }

    setSubmitting(true);
    try {
      const path = buildScreenshotPath(userId, file);
      const { error: uploadError } = await supabase.storage
        .from(PAYMENT_SCREENSHOT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: submitError } = await supabase.rpc('submit_coin_request', {
        p_package_id: pkg.id,
        p_transaction_id: cleanTxn,
        p_screenshot_path: path,
      });
      if (submitError) throw submitError;

      setTransactionId('');
      clearFile();
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <section className={`${cardClass} text-center animate-pop`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-700" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-stone-900">Request Sent, Waiting For Admin Approval</h2>
        <p className="mt-2 text-sm text-stone-600">
          Admin payment check karke approve karega, phir coins aap ke wallet mein add ho jayenge.
        </p>
        <Button variant="secondary" className="mt-5" onClick={() => setSuccess(false)}>
          Naya Request Bhejein
        </Button>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-bold text-stone-900">Payment Ka Screenshot Bhejein</h2>
      <p className="mt-2 rounded-xl bg-gold-50 px-4 py-3 text-sm font-semibold text-stone-800">
        Package: <span className="font-extrabold text-stone-900">{formatNumber(pkg.coins)} Coins</span>
        {' '}for{' '}
        <span className="font-extrabold text-stone-900">{formatNumber(pkg.rupees)} Rs</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <div>
          <label htmlFor="coins-txn" className={labelClass}>Transaction ID</label>
          <input
            id="coins-txn"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            maxLength={TXN_MAX}
            autoComplete="off"
            placeholder="Payment ki Transaction ID"
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>Payment Screenshot</span>
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-stone-200">
              <img src={previewUrl} alt="Screenshot preview" className="max-h-64 w-full object-contain bg-stone-100" />
              <button
                type="button"
                onClick={clearFile}
                aria-label="Screenshot hatayein"
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-stone-700 shadow hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50">
              <ImagePlus className="h-8 w-8 text-emerald-700" />
              <span className="font-semibold text-stone-800">Screenshot select karein</span>
              <span className="text-xs text-stone-500">PNG ya JPG, 5 MB tak</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full py-3.5 text-base" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Bhej rahe hain...' : 'Request Submit Karein'}
        </Button>
      </form>
    </section>
  );
}
