import type { LucideIcon } from 'lucide-react';
import { Coins, Gamepad2, Medal, Trophy, UserRound } from 'lucide-react';
import { COIN_RATE, WEEKLY_PRIZES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import type { PlayerPage, Profile } from '@/lib/types';

interface HomePageProps {
  profile: Profile;
  onNavigate: (page: PlayerPage) => void;
}

const PRIZE_LABELS = ['1st', '2nd', '3rd'] as const;

const ACTIONS: { page: PlayerPage; title: string; subtitle: string; icon: LucideIcon }[] = [
  { page: 'ludo', title: 'Yodo Ludo Khelo', subtitle: 'Har game 2 Points, Jeet par 10 Points', icon: Gamepad2 },
  { page: 'coins', title: 'Coins Kharido', subtitle: `${COIN_RATE.rupees} Rs = ${formatNumber(COIN_RATE.coins)} Coins`, icon: Coins },
  { page: 'leaderboard', title: 'Leaderboard', subtitle: 'Is hafte ki top list', icon: Trophy },
  { page: 'profile', title: 'Mera Profile', subtitle: 'Naam, number aur balance', icon: UserRound },
];

export default function HomePage({ profile, onNavigate }: HomePageProps) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 p-6 text-stone-900 shadow-lg shadow-gold-500/30 animate-fade-in">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-800">Weekly Inam</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">Is Haftay Ka Inam!</h1>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {WEEKLY_PRIZES.map((prize, index) => (
              <div key={prize.place} className="rounded-2xl bg-white/80 px-2 py-3 text-center shadow-sm">
                <p className="text-xs font-semibold text-stone-600">{PRIZE_LABELS[index]}</p>
                <p className="text-lg font-extrabold text-stone-900 sm:text-xl">{prize.rupees} Rs</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-stone-600">Aap ke Coins</p>
          <p className="text-3xl font-extrabold text-stone-900">{formatNumber(profile.coins)}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100">
          <Medal className="h-6 w-6 text-gold-700" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map(({ page, title, subtitle, icon: Icon }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md active:scale-[0.98]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-bold text-stone-900">{title}</span>
              <span className="mt-1 block text-sm text-stone-600">{subtitle}</span>
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
