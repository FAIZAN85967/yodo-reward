import { useState } from 'react';
import CoinRequestForm from '@/components/coins/CoinRequestForm';
import MyCoinRequests from '@/components/coins/MyCoinRequests';
import PaymentNumbers from '@/components/coins/PaymentNumbers';
import { COIN_RATE } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import type { Profile } from '@/lib/types';

export default function CoinsPage({ profile }: { profile: Profile }) {
  const [historyVersion, setHistoryVersion] = useState(0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-emerald-100">Coins Ka Rate</p>
        <p className="mt-1 text-3xl font-extrabold">
          {COIN_RATE.rupees} Rs = {formatNumber(COIN_RATE.coins)} Coins
        </p>
        <p className="mt-3 text-sm text-emerald-100">
          Aap ke abhi Coins: <span className="font-bold text-gold-200">{formatNumber(profile.coins)}</span>
        </p>
      </section>

      <PaymentNumbers />

      <CoinRequestForm userId={profile.id} onSubmitted={() => setHistoryVersion((v) => v + 1)} />

      <MyCoinRequests userId={profile.id} version={historyVersion} />
    </div>
  );
}
