// Shared stock-category presentation: canonical ordering + colour coding.
//
// Category *names* live in the `stock_categories` DB table; the colours here are a
// frontend concern keyed by the exact category name (no schema column). Unknown
// names fall back to a neutral slate so a newly-added category still renders cleanly.
// `chip`/`accent` are pre-baked to contrast with each header background.

export interface CategoryMeta {
  /** Header container background + text colour. */
  header: string;
  /** Left accent bar background. */
  accent: string;
  /** Left accent bar as a border colour (literal class for Tailwind's scanner). */
  border: string;
  /** Left-side-only border colour (literal class) — used for the continuous group stripe. */
  borderL: string;
  /** Legend swatch background. */
  swatch: string;
  /** Pill ("N items" / "Total on hand") classes that read on this header. */
  chip: string;
  /** Collapse-chevron colour for this header. */
  chevron: string;
}

// Canonical display order requested by the business.
export const CATEGORY_ORDER = [
  'Box Sets',
  'Liners',
  'Sharps',
  'Anatomical (Specibins)',
  'Pharmaceutical',
  'External Customer Containers',
  'Other',
] as const;

// Light-background headers (dark text) vs dark-background headers (white text) get
// different chip/chevron treatments so both stay legible.
const LIGHT_CHIP = 'bg-black/5 text-gray-700 border border-black/10';
const DARK_CHIP = 'bg-white/15 text-white border border-white/25';

const META: Record<string, CategoryMeta> = {
  'Box Sets': {
    header: 'bg-gray-200 text-gray-800',
    accent: 'bg-gray-400', border: 'border-gray-400', borderL: 'border-l-gray-400', swatch: 'bg-gray-300', chip: LIGHT_CHIP, chevron: 'text-gray-500',
  },
  'Liners': {
    header: 'bg-red-100 text-red-800',
    accent: 'bg-red-400', border: 'border-red-400', borderL: 'border-l-red-400', swatch: 'bg-red-200', chip: LIGHT_CHIP, chevron: 'text-red-500',
  },
  'Sharps': {
    header: 'bg-yellow-300 text-yellow-900',
    accent: 'bg-yellow-500', border: 'border-yellow-500', borderL: 'border-l-yellow-500', swatch: 'bg-yellow-300', chip: LIGHT_CHIP, chevron: 'text-yellow-700',
  },
  'Anatomical (Specibins)': {
    header: 'bg-red-800 text-white',
    accent: 'bg-red-950', border: 'border-red-950', borderL: 'border-l-red-950', swatch: 'bg-red-800', chip: DARK_CHIP, chevron: 'text-red-200',
  },
  'Pharmaceutical': {
    header: 'bg-emerald-600 text-white',
    accent: 'bg-emerald-800', border: 'border-emerald-800', borderL: 'border-l-emerald-800', swatch: 'bg-emerald-600', chip: DARK_CHIP, chevron: 'text-emerald-100',
  },
  'External Customer Containers': {
    header: 'bg-gray-600 text-white',
    accent: 'bg-gray-800', border: 'border-gray-800', borderL: 'border-l-gray-800', swatch: 'bg-gray-600', chip: DARK_CHIP, chevron: 'text-gray-300',
  },
  'Other': {
    header: 'bg-gray-900 text-white',
    accent: 'bg-black', border: 'border-black', borderL: 'border-l-black', swatch: 'bg-gray-900', chip: DARK_CHIP, chevron: 'text-gray-400',
  },
};

const FALLBACK: CategoryMeta = {
  header: 'bg-slate-100 text-slate-800',
  accent: 'bg-slate-400', border: 'border-slate-400', borderL: 'border-l-slate-400', swatch: 'bg-slate-300', chip: LIGHT_CHIP, chevron: 'text-slate-500',
};

export function categoryMeta(name: string): CategoryMeta {
  return META[name] ?? FALLBACK;
}

// Sort comparator honouring CATEGORY_ORDER, with unknown names alphabetised at the end.
export function compareCategories(a: string, b: string): number {
  const ai = CATEGORY_ORDER.indexOf(a as typeof CATEGORY_ORDER[number]);
  const bi = CATEGORY_ORDER.indexOf(b as typeof CATEGORY_ORDER[number]);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}
