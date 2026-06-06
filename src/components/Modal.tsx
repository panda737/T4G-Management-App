import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  accent?: 'green' | 'red' | 'cyan' | 'blue' | 'amber' | 'orange' | 'gray';
}

export default function Modal({ title, onClose, children, footer, size = 'md', accent }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const widths: Record<string, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  const accentStyles: Record<string, { border: string; headerBg: string; titleColor: string }> = {
    green: { border: 'sm:border-t-4 sm:border-t-emerald-500', headerBg: 'bg-emerald-50', titleColor: 'text-emerald-900' },
    red:   { border: 'sm:border-t-4 sm:border-t-red-500',     headerBg: 'bg-red-50',     titleColor: 'text-red-900' },
    cyan:  { border: 'sm:border-t-4 sm:border-t-cyan-500',    headerBg: 'bg-cyan-50',    titleColor: 'text-cyan-900' },
    blue:  { border: 'sm:border-t-4 sm:border-t-blue-500',    headerBg: 'bg-blue-50',    titleColor: 'text-blue-900' },
    amber:  { border: 'sm:border-t-4 sm:border-t-amber-500',   headerBg: 'bg-amber-50',   titleColor: 'text-amber-900' },
    orange: { border: 'sm:border-t-4 sm:border-t-orange-500',  headerBg: 'bg-orange-50',  titleColor: 'text-orange-900' },
    gray:   { border: 'sm:border-t-4 sm:border-t-slate-500',   headerBg: 'bg-slate-50',   titleColor: 'text-slate-900' },
  };

  const a = accent ? accentStyles[accent] : { border: '', headerBg: 'bg-white', titleColor: 'text-gray-900' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white w-full flex flex-col overflow-hidden h-full sm:h-[88vh] sm:rounded-xl shadow-2xl ${widths[size]} ${a.border}`}
      >
        {/* Fixed header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-200 ${a.headerBg} flex-shrink-0`}>
          <h2 className={`text-base font-semibold ${a.titleColor}`}>{title}</h2>
          <button onClick={onClose} className="p-1 -mr-1 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-black/5">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
