import { useCallback, useEffect, useState } from 'react';
import { Bell, CreditCard, LogOut, Trophy } from 'lucide-react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminSettingsPanel from '@/components/admin/AdminSettingsPanel';
import CoinRequestsPanel from '@/components/admin/CoinRequestsPanel';
import WeeklyWinnersPanel from '@/components/admin/WeeklyWinnersPanel';
import Logo from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase';
import type { AdminCoinRequest } from '@/lib/types';

type AdminTab = 'requests' | 'settings' | 'winners';
type GateState = 'checking' | 'signed-out' | 'admin';

const POLL_MS = 15000;
const NOT_ADMIN_MESSAGE = 'Ye account admin nahi hai.';

const TABS: { id: AdminTab; label: string; icon: typeof Bell }[] = [
  { id: 'requests', label: 'Coin Requests', icon: Bell },
  { id: 'settings', label: 'Payment Settings', icon: CreditCard },
  { id: 'winners', label: 'Weekly Winners', icon: Trophy },
];

export default function AdminPage() {
  const [gate, setGate] = useState<GateState>('checking');
  const [tab, setTab] = useState<AdminTab>('requests');
  const [pendingCount, setPendingCount] = useState(0);

  const checkAdmin = useCallback(async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setGate('signed-out');
      return null;
    }
    const { data: isAdmin, error } = await supabase.rpc('is_admin');
    if (error || isAdmin !== true) {
      await supabase.auth.signOut();
      setGate('signed-out');
      return NOT_ADMIN_MESSAGE;
    }
    setGate('admin');
    return null;
  }, []);

  const loadPendingCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_coin_requests', { p_status: 'pending' });
    if (!error && data) setPendingCount((data as AdminCoinRequest[]).length);
  }, []);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (gate !== 'admin') return;
    void loadPendingCount();
    const id = window.setInterval(() => void loadPendingCount(), POLL_MS);
    return () => window.clearInterval(id);
  }, [gate, loadPendingCount]);

  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return 'Email ya password ghalat hai.';
    return checkAdmin();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setGate('signed-out');
  };

  if (gate === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-600">
        Admin panel load ho raha hai...
      </div>
    );
  }

  if (gate === 'signed-out') return <AdminLogin onSubmit={handleLogin} />;

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-30 bg-emerald-950 text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold">ADMIN</span>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={() => setTab('requests')}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-red-600 px-5 py-4 text-left font-bold text-white shadow-lg animate-pop"
          >
            <span className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              {pendingCount} Nayi Request Hai
            </span>
            <span className="text-sm font-semibold text-red-100">Dekhein</span>
          </button>
        )}

        <nav className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-1.5 shadow-sm" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                tab === id ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>

        {tab === 'requests' && <CoinRequestsPanel onChanged={loadPendingCount} />}
        {tab === 'settings' && <AdminSettingsPanel />}
        {tab === 'winners' && <WeeklyWinnersPanel />}
      </main>
    </div>
  );
}
