import { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Confetti from '@/components/ui/Confetti';
import { WELCOME_BONUS_COINS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/format';
import { supabase } from '@/lib/supabase';

interface WelcomeBonusModalProps {
  onDone: () => Promise<void>;
}

export default function WelcomeBonusModal({ onDone }: WelcomeBonusModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    const { error: ackError } = await supabase.rpc('acknowledge_welcome_bonus');
    if (ackError) {
      setError(getErrorMessage(ackError));
      setBusy(false);
      return;
    }
    await onDone();
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-stone-900/70 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome bonus"
    >
      <Confetti count={120} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl animate-pop">
        <div className="bg-gradient-to-b from-gold-200 via-gold-400 to-gold-500 px-6 pb-8 pt-10 text-center text-stone-900">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg animate-pop">
            <Gift className="h-10 w-10 text-gold-600" />
          </span>
          <h2 className="mt-5 text-3xl font-black leading-tight">Mubarak Ho!</h2>
          <p className="mt-2 text-base font-semibold">Aapko {formatNumber(WELCOME_BONUS_COINS)} Coins FREE Mil Gaye!</p>
        </div>

        <div className="space-y-5 px-6 py-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-gold-400 bg-gold-50 px-6 py-3">
            <Sparkles className="h-5 w-5 text-gold-600" />
            <span className="text-3xl font-extrabold text-stone-900">{formatNumber(WELCOME_BONUS_COINS)}</span>
            <span className="text-sm font-bold text-stone-700">Coins</span>
          </div>
          <p className="text-sm text-stone-600">Ye bonus sirf ek baar milta hai. Ab Ludo khelein aur Points kamayein.</p>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
          )}

          <Button variant="gold" className="w-full py-3.5 text-base" loading={busy} onClick={() => void handleStart()}>
            Shuru Karen
          </Button>
        </div>
      </div>
    </div>
  );
}
