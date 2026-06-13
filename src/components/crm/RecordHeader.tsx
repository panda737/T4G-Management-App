import { ArrowLeft } from 'lucide-react';
import { initials, colorFromString } from './crmUtils';

export interface Highlight { label: string; value: React.ReactNode }

interface RecordHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** lucide icon; if omitted an initials avatar is shown. */
  icon?: React.ElementType;
  badges?: React.ReactNode;
  highlights?: Highlight[];
  actions?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

/** Salesforce-style record banner: avatar/icon, title, status badges, KPI strip, actions. */
export default function RecordHeader({
  title, subtitle, icon: Icon, badges, highlights, actions, onBack, backLabel = 'Back',
}: RecordHeaderProps) {
  const tint = colorFromString(title);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-start gap-3 p-4">
        {onBack && (
          <button onClick={onBack} title={backLabel}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition flex-shrink-0 mt-0.5">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-shrink-0">
          {Icon ? (
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Icon size={22} className="text-indigo-600" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: tint }}>{initials(title)}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
            {badges}
          </div>
          {subtitle && <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {highlights && highlights.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
          {highlights.map((h, i) => (
            <div key={i} className="px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-gray-400">{h.label}</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">{h.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
