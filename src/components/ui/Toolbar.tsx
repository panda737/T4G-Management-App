import { Search } from 'lucide-react';
import { accent, type Accent } from './accents';

// ── Toolbar container ───────────────────────────────────────────────────────
interface ToolbarProps {
  /** Left-side controls (search, filters). */
  children: React.ReactNode;
  /** Right-aligned controls (export, column picker, etc.). */
  actions?: React.ReactNode;
}

/** Flex-wrap toolbar row matching the CRM list toolbar. */
export function Toolbar({ children, actions }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
    </div>
  );
}

// ── Search input ────────────────────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }: SearchInputProps) {
  return (
    <div className={`relative flex-1 min-w-[200px] max-w-sm ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      />
    </div>
  );
}

// ── Filter select ───────────────────────────────────────────────────────────
interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  /** Value treated as "no filter" (highlights when value differs). Default 'All'. */
  allValue?: string;
  accent?: Accent;
  children: React.ReactNode; // <option> list
  className?: string;
}

export function FilterSelect({ value, onChange, allValue = 'All', accent: a = 'indigo', children, className = '' }: FilterSelectProps) {
  const active = value !== allValue && value !== '';
  const ac = accent(a);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${active ? ac.filterActive : 'border-gray-200 text-gray-600'} ${className}`}
    >
      {children}
    </select>
  );
}
