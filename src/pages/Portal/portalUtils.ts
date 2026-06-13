import { useEffect, useState } from 'react';
import { supabase, type ReceivedWasteCustomerRow } from '../../lib/supabase';

/** Loads the signed-in customer's received-waste rows (RLS view scopes to their client). */
export function usePortalWaste() {
  const [rows, setRows] = useState<ReceivedWasteCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('v_received_waste')
        .select('*')
        .order('received_date', { ascending: false });
      if (err) setError(err.message);
      setRows((data ?? []) as ReceivedWasteCustomerRow[]);
      setLoading(false);
    })();
  }, []);

  return { rows, loading, error };
}

export const kg = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
export const num = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });

export function monthKey(dateIso: string | null): string {
  return dateIso ? dateIso.substring(0, 7) : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabel(ym: string): string {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function fmtDate(dateIso: string | null): string {
  return dateIso ? new Date(dateIso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const PALETTE = ['#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#6b7280'];
export function colorFor(key: string, index: number): string {
  void key;
  return PALETTE[index % PALETTE.length];
}

export function sumBy<T>(rows: T[], group: (r: T) => string, value: (r: T) => number): [string, number][] {
  const map: Record<string, number> = {};
  rows.forEach(r => { const k = group(r) || '—'; map[k] = (map[k] || 0) + value(r); });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
