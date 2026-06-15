import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Admin-facing dashboard load-error notice.
 *
 * Rendered when a dashboard's data query FAILS — so a failed load is never
 * mistaken for genuine zero data. Distinct from a normal empty state:
 *   • loading  → spinner
 *   • error    → this notice (load failed; figures are NOT real zeros)
 *   • empty    → the page's own "no data yet" state
 *   • success  → the real values
 */
export default function DashboardError({
  title = 'Dashboard',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">Some data failed to load</p>
          <p className="text-xs text-red-600 mt-1">
            The figures below could not be retrieved, so they are not shown. This is a load
            error — it does <span className="font-semibold">not</span> mean the underlying
            values are zero. Please retry; if it persists, contact an administrator.
          </p>
          {message && (
            <p className="text-[11px] text-red-500/80 mt-2 font-mono break-words">{message}</p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition flex-shrink-0"
          >
            <RefreshCw size={12} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}
