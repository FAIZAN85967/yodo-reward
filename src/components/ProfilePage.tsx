import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Coins, LogOut, Phone, Save, UserRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatDate, formatNumber } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { cardClass, inputClass, labelClass } from '@/lib/styles';
import type { Profile } from '@/lib/types';

interface ProfilePageProps {
  profile: Profile;
  onProfileUpdated: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function ProfilePage({ profile, onProfileUpdated, onSignOut }: ProfilePageProps) {
  const [name, setName] = useState(profile.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);

  const cleanName = name.trim();
  const canSave = cleanName.length > 0 && cleanName !== profile.name && !saving;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('profiles').update({ name: cleanName }).eq('id', profile.id);
    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: 'Naam save nahi ho saka. Dobara koshish karein.' });
      return;
    }
    setMessage({ type: 'success', text: 'Naam update ho gaya.' });
    await onProfileUpdated();
  };

  return (
    <div className="space-y-6">
      <section className={`${cardClass} flex items-center gap-4`}>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-2xl font-extrabold text-white">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-extrabold text-stone-900">{profile.name}</p>
          <p className="text-sm text-stone-600">Player</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <Coins className="h-5 w-5 text-gold-600" />
          <p className="mt-3 text-sm text-stone-600">Coins Balance</p>
          <p className="text-2xl font-extrabold text-stone-900">{formatNumber(profile.coins)}</p>
        </div>
        <div className={cardClass}>
          <Phone className="h-5 w-5 text-emerald-700" />
          <p className="mt-3 text-sm text-stone-600">Mobile Number</p>
          <p className="text-lg font-bold text-stone-900">{profile.mobile}</p>
        </div>
        <div className={cardClass}>
          <CalendarDays className="h-5 w-5 text-emerald-700" />
          <p className="mt-3 text-sm text-stone-600">Joined</p>
          <p className="text-lg font-bold text-stone-900">{formatDate(profile.created_at)}</p>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-bold text-stone-900">Naam Change Karein</h2>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label htmlFor="profile-name" className={labelClass}>Naam</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="profile-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>
          {message && (
            <p
              role="status"
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={!canSave} loading={saving}>
            <Save className="h-4 w-4" />
            Save Karein
          </Button>
        </form>
      </section>

      <Button variant="secondary" className="w-full" onClick={() => void onSignOut()}>
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
