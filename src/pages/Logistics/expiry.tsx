// Shared expiry helpers + chips for the Logistics registers. Mirrors the
// 30-day "soon" threshold used by the Compliance → Expiry Dashboard.

export type ExpiryStatus = 'expired' | 'soon' | 'ok' | 'none';

export function statusOf(date: string | null): ExpiryStatus {
  if (!date) return 'none';
  const days = (new Date(date).getTime() - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

const RANK: Record<ExpiryStatus, number> = { expired: 3, soon: 2, ok: 1, none: 0 };

/** The most urgent status across several expiry dates (for a row-level summary). */
export function worstStatus(dates: (string | null)[]): ExpiryStatus {
  return dates.reduce<ExpiryStatus>((worst, d) => {
    const s = statusOf(d);
    return RANK[s] > RANK[worst] ? s : worst;
  }, 'none');
}

export function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

const CHIP: Record<ExpiryStatus, string> = {
  expired: 'bg-red-50 text-red-700 border border-red-200',
  soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  ok: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  none: 'bg-gray-50 text-gray-400 border border-gray-200',
};
const LABEL: Record<ExpiryStatus, string> = {
  expired: 'Expired',
  soon: 'Due soon',
  ok: 'Valid',
  none: 'Not set',
};

/** A date shown as a status-coloured pill (red expired / amber soon / green ok). */
export function ExpiryDate({ date }: { date: string | null }) {
  const s = statusOf(date);
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${CHIP[s]}`}>
      {date ? fmtDate(date) : '—'}
    </span>
  );
}

/** A summary chip (Valid / Due soon / Expired / Not set). */
export function ComplianceChip({ status }: { status: ExpiryStatus }) {
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${CHIP[status]}`}>
      {LABEL[status]}
    </span>
  );
}
