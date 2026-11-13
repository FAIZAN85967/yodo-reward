import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const PROFILE_COLUMNS = 'id, name, mobile, coins, created_at, welcome_bonus_pending';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next) {
        setProfile(null);
        setReady(true);
        return;
      }
      try {
        const loaded = await fetchProfile(next.user.id);
        if (active) setProfile(loaded);
      } catch {
        if (active) setProfile(null);
      }
      if (active) setReady(true);
    };

    supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      (async () => {
        await sync(next);
      })();
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setProfile(await fetchProfile(userId));
    } catch {
      // Keep the last known profile when a background refresh fails.
    }
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, profile, ready, refreshProfile, signOut };
}
