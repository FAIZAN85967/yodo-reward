import { BellOff } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/format';
import type { AppNotification } from '@/lib/types';

interface NotificationsModalProps {
  items: AppNotification[];
  error: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ items, error, onClose }: NotificationsModalProps) {
  return (
    <Modal title="Notifications" onClose={onClose}>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Notifications load nahi ho sakin.
        </p>
      )}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-stone-500">
          <BellOff className="h-10 w-10 text-stone-300" />
          <p>Abhi koi notification nahi hai.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border p-4 ${n.is_read ? 'border-stone-200 bg-white' : 'border-gold-400 bg-gold-50'}`}
            >
              <p className="font-semibold text-stone-900">{n.title}</p>
              <p className="mt-1 text-sm text-stone-700">{n.body}</p>
              <p className="mt-2 text-xs text-stone-500">{formatDateTime(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
