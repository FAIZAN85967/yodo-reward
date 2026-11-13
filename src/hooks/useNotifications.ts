import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/types';

const POLL_MS = 20000;

export function useNotifications(userId: string) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('notifications')
      .select('id, title, body, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (loadError) {
      setError(true);
      return;
    }
    setError(false);
    setItems((data ?? []) as AppNotification[]);
  }, [userId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
    if (updateError) {
      setError(true);
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [items]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  return { items, unreadCount, error, markAllRead };
}
