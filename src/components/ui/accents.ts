// Shared accent palette for app-wide page chrome (PageHeader, Button, Toolbar,
// FilterTabs, StatStrip). Each module keeps its own colour by passing an `accent`;
// the layout/shapes stay uniform. Mirrors the palette concept in components/Modal.tsx.

export type Accent =
  | 'indigo' | 'emerald' | 'amber' | 'orange' | 'sky'
  | 'blue' | 'cyan' | 'rose' | 'violet' | 'teal' | 'gray';

export interface AccentClasses {
  /** Solid primary button. */
  solid: string;
  /** Soft icon chip (bg + text). */
  iconBg: string;
  iconText: string;
  /** Active filter-tab (solid pill). */
  tabActive: string;
  /** Ring + text for an active filter <select>. */
  filterActive: string;
  /** Plain accent text (links, counts). */
  text: string;
}

export const ACCENTS: Record<Accent, AccentClasses> = {
  indigo: {
    solid: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    iconBg: 'bg-indigo-50', iconText: 'text-indigo-600',
    tabActive: 'bg-indigo-600 text-white', filterActive: 'border-indigo-300 text-indigo-700',
    text: 'text-indigo-600',
  },
  emerald: {
    solid: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',
    tabActive: 'bg-emerald-600 text-white', filterActive: 'border-emerald-300 text-emerald-700',
    text: 'text-emerald-600',
  },
  amber: {
    solid: 'bg-amber-600 hover:bg-amber-700 text-white',
    iconBg: 'bg-amber-50', iconText: 'text-amber-600',
    tabActive: 'bg-amber-600 text-white', filterActive: 'border-amber-300 text-amber-700',
    text: 'text-amber-600',
  },
  orange: {
    solid: 'bg-orange-600 hover:bg-orange-700 text-white',
    iconBg: 'bg-orange-50', iconText: 'text-orange-600',
    tabActive: 'bg-orange-600 text-white', filterActive: 'border-orange-300 text-orange-700',
    text: 'text-orange-600',
  },
  sky: {
    solid: 'bg-sky-600 hover:bg-sky-700 text-white',
    iconBg: 'bg-sky-50', iconText: 'text-sky-600',
    tabActive: 'bg-sky-600 text-white', filterActive: 'border-sky-300 text-sky-700',
    text: 'text-sky-600',
  },
  blue: {
    solid: 'bg-blue-600 hover:bg-blue-700 text-white',
    iconBg: 'bg-blue-50', iconText: 'text-blue-600',
    tabActive: 'bg-blue-600 text-white', filterActive: 'border-blue-300 text-blue-700',
    text: 'text-blue-600',
  },
  cyan: {
    solid: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    iconBg: 'bg-cyan-50', iconText: 'text-cyan-600',
    tabActive: 'bg-cyan-600 text-white', filterActive: 'border-cyan-300 text-cyan-700',
    text: 'text-cyan-600',
  },
  rose: {
    solid: 'bg-rose-600 hover:bg-rose-700 text-white',
    iconBg: 'bg-rose-50', iconText: 'text-rose-600',
    tabActive: 'bg-rose-600 text-white', filterActive: 'border-rose-300 text-rose-700',
    text: 'text-rose-600',
  },
  violet: {
    solid: 'bg-violet-600 hover:bg-violet-700 text-white',
    iconBg: 'bg-violet-50', iconText: 'text-violet-600',
    tabActive: 'bg-violet-600 text-white', filterActive: 'border-violet-300 text-violet-700',
    text: 'text-violet-600',
  },
  teal: {
    solid: 'bg-teal-600 hover:bg-teal-700 text-white',
    iconBg: 'bg-teal-50', iconText: 'text-teal-600',
    tabActive: 'bg-teal-600 text-white', filterActive: 'border-teal-300 text-teal-700',
    text: 'text-teal-600',
  },
  gray: {
    solid: 'bg-gray-800 hover:bg-gray-900 text-white',
    iconBg: 'bg-gray-100', iconText: 'text-gray-600',
    tabActive: 'bg-gray-800 text-white', filterActive: 'border-gray-400 text-gray-700',
    text: 'text-gray-600',
  },
};

export const accent = (a: Accent = 'indigo'): AccentClasses => ACCENTS[a] ?? ACCENTS.indigo;
