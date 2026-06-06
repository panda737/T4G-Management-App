import { Clock, AlertTriangle, CheckCircle2, FileCheck } from 'lucide-react';
import { createElement } from 'react';
import type { StockTakeLineItem } from '../../lib/supabase';

export const STATUS_STYLE: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600 border border-gray-200',
  'In Progress': 'bg-blue-100 text-blue-700 border border-blue-200',
  Completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Approved: 'bg-green-100 text-green-800 border border-green-200',
};

export const STATUS_ICON: Record<string, React.ReactNode> = {
  Draft: createElement(Clock, { size: 11 }),
  'In Progress': createElement(AlertTriangle, { size: 11 }),
  Completed: createElement(CheckCircle2, { size: 11 }),
  Approved: createElement(FileCheck, { size: 11 }),
};

const CATEGORY_ORDER = ['Liners', 'Sharps', 'External Customer Containers', 'Anatomical (Specibins)', 'Pharmaceutical', 'Box Sets', 'Other'];

export function sortedCategories(grouped: Record<string, StockTakeLineItem[]>) {
  return Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });
}

export function groupByCategory(lines: StockTakeLineItem[]) {
  const map: Record<string, StockTakeLineItem[]> = {};
  lines.forEach(l => { if (!map[l.category]) map[l.category] = []; map[l.category].push(l); });
  return map;
}
