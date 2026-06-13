import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface RelatedListProps {
  title: string;
  icon?: React.ElementType;
  count?: number;
  /** Header-right slot, e.g. a "+ New" button. */
  action?: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  isEmpty?: boolean;
  empty?: string;
  children: React.ReactNode;
}

/** Salesforce-style related-list card: collapsible, counted header, optional action. */
export default function RelatedList({
  title, icon: Icon, count, action, defaultOpen = true, collapsible = true,
  isEmpty, empty = 'Nothing here yet.', children,
}: RelatedListProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => collapsible && setOpen(o => !o)}
          className={`flex items-center gap-2 min-w-0 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}>
          {collapsible && (open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />)}
          {Icon && <Icon size={16} className="text-indigo-500" />}
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {count !== undefined && <span className="text-xs text-gray-400">({count})</span>}
        </button>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {open && (
        <div>
          {isEmpty
            ? <div className="px-4 py-8 text-center text-sm text-gray-400">{empty}</div>
            : children}
        </div>
      )}
    </div>
  );
}
