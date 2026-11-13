import { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import WelcomeBonusModal from '@/components/bonus/WelcomeBonusModal';
import AuthPage from '@/components/auth/AuthPage';
import CoinsPage from '@/components/coins/CoinsPage';
import HomePage from '@/components/HomePage';
import LeaderboardPage from '@/components/LeaderboardPage';
import LudoGame from '@/components/ludo/LudoGame';
import ProfilePage from '@/components/ProfilePage';
import SplashScreen from '@/components/SplashScreen';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import type { PlayerPage } from '@/lib/types';

const MIN_SPLASH_MS = 2200;
const PROFILE_REFRESH_MS = 20000;

const PAGE_TITLES: Record<PlayerPage, string> = {
  home: 'Home',
  coins: 'Coins Kharido',
  leaderboard: 'Leaderboard',
  profile: 'Mera Profile',
  ludo: 'Yodo Ludo',
};

function ProfileLoadError({ onRetry, onSignOut }: { onRetry: () => Promise<void>; onSignOut: () => Promise<void> }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
      <p className="text-lg font-bold text-stone-900">Aap ki profile load nahi ho saki.</p>
      <p className="text-sm text-stone-600">Internet check karke dobara koshish karein.</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => void onRetry()}>Dobara Try Karein</Button>
        <Button variant="ghost" onClick={() => void onSignOut()}>Logout</Button>
      </div>
    </div>
  );
}

export default function PlayerApp() {
  const auth = useAuth();
  const { refreshProfile } = auth;
  const [splashDone, setSplashDone] = useState(false);
  const [page, setPage] = useState<PlayerPage>('home');
  const isSignedIn = auth.session !== null;

  useEffect(() => {
    const id = window.setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [page, refreshProfile]);

  useEffect(() => {
    if (!isSignedIn) return;
    const id = window.setInterval(() => void refreshProfile(), PROFILE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [isSignedIn, refreshProfile]);

  if (!splashDone || !auth.ready) return <SplashScreen />;
  if (!auth.session) return <AuthPage />;
  if (!auth.profile) return <ProfileLoadError onRetry={refreshProfile} onSignOut={auth.signOut} />;

  const profile = auth.profile;

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader
        profile={profile}
        title={PAGE_TITLES[page]}
        onBack={page === 'home' ? undefined : () => setPage('home')}
      />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        {page === 'home' && <HomePage profile={profile} onNavigate={setPage} />}
        {page === 'coins' && <CoinsPage profile={profile} />}
        {page === 'leaderboard' && <LeaderboardPage />}
        {page === 'profile' && (
          <ProfilePage profile={profile} onProfileUpdated={refreshProfile} onSignOut={auth.signOut} />
        )}
        {page === 'ludo' && <LudoGame playerName={profile.name} onPointsRecorded={refreshProfile} />}
      </main>
      {profile.welcome_bonus_pending && <WelcomeBonusModal onDone={refreshProfile} />}
    </div>
  );
}
