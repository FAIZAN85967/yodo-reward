import { useState } from 'react';
import { ArrowLeft, Bell, Coins } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import NotificationsModal from '@/components/NotificationsModal';
import { useNotifications } from '@/hooks/useNotifications';
import { formatNumber } from '@/lib/format';
import type { Profile } from '@/lib/types';

interface AppHeaderProps {
  profile: Profile;
  title: string;
  onBack?: () => void;
}

export default function AppHeader({ profile, title, onBack }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const notifications = useNotifications(profile.id);

  const openNotifications = () => {
    setOpen(true);
    void notifications.markAllRead();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900 bg-emerald-950 text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Wapis home par jayein"
            className="rounded-full p-2 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {onBack ? <p className="truncate text-lg font-bold">{title}</p> : <Logo size="sm" />}
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1.5 text-sm font-bold text-gold-100 ring-1 ring-gold-400/40"
          title="Aap ke Coins"
        >
          <Coins className="h-4 w-4 text-gold-400" />
          {formatNumber(profile.coins)}
        </div>

        <button
          type="button"
          onClick={openNotifications}
          aria-label="Notifications"
          className="relative rounded-full p-2 transition hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          {notifications.unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {notifications.unreadCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <NotificationsModal
          items={notifications.items}
          error={notifications.error}
          onClose={() => setOpen(false)}
        />
      )}
    </header>
  );
}
