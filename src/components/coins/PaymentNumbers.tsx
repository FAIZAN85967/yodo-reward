import { useEffect, useState } from 'react';
import { Check, Copy, Smartphone } from 'lucide-react';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cardClass } from '@/lib/styles';
import type { PaymentNumbers as PaymentNumbersData } from '@/lib/types';

const COPY_FEEDBACK_MS = 2000;

interface PaymentMethod {
  key: keyof PaymentNumbersData;
  label: string;
  accent: string;
}

const METHODS: PaymentMethod[] = [
  { key: 'jazzcash_number', label: 'JazzCash', accent: 'border-l-red-500' },
  { key: 'easypaisa_number', label: 'Easypaisa', accent: 'border-l-emerald-600' },
];

export default function PaymentNumbers() {
  const [numbers, setNumbers] = useState<PaymentNumbersData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('jazzcash_number, easypaisa_number')
        .eq('id', 1)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setLoadError(true);
        return;
      }
      setNumbers(data as PaymentNumbersData | null);
    })();
    return () => {
      active = false;
    };
  }, []);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFailed(false);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), COPY_FEEDBACK_MS);
    } catch {
      setCopiedKey(null);
      setCopyFailed(true);
    }
  };

  return (
    <section className={cardClass}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
          <Smartphone className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-900">Payment Karein</h2>
          <p className="text-sm text-stone-600">In numbers par payment bhejein, phir neechay form bharein.</p>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Payment numbers load nahi ho sake. Dobara koshish karein.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {METHODS.map((method) => {
          const value = numbers?.[method.key]?.trim() ?? '';
          const isCopied = copiedKey === method.key;
          return (
            <div
              key={method.key}
              className={`flex flex-col gap-3 rounded-xl border border-l-4 border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between ${method.accent}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-600">{method.label} Number</p>
                <p className="mt-0.5 break-all text-xl font-extrabold tracking-wide text-stone-900">
                  {numbers === null && !loadError ? '...' : value || 'Abhi set nahi hua'}
                </p>
              </div>
              <Button
                variant="secondary"
                className="shrink-0 py-2.5"
                disabled={!value}
                onClick={() => void copy(method.key, value)}
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                {isCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          );
        })}
      </div>

      {copyFailed && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          Copy nahi ho saka. Number ko haath se select karke copy karein.
        </p>
      )}
    </section>
  );
}
