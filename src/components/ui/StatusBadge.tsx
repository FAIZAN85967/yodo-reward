import type { CoinRequestStatus } from '@/lib/types';

const STATUS_STYLES: Record<CoinRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Intezaar mein', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }: { status: CoinRequestStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
