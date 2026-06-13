// Shared helpers for the CRM "Salesforce-feel" component system.

/** Trigger a client-side CSV download (Excel-friendly: BOM + CRLF). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** en-ZA integer/0-dp formatter (kg, counts). */
export const fmtNum = (n: number | null | undefined, dp = 0) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-ZA', { maximumFractionDigits: dp });

/** Short date: 7 Jun 2026. */
export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Relative-ish date+time for timelines: "7 Jun 2026, 14:32". */
export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Stable palette reused across donuts / avatars. */
export const CRM_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#ec4899', '#f97316', '#14b8a6', '#84cc16', '#6b7280'];

/** Deterministic colour from a string (avatar tints). */
export function colorFromString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CRM_PALETTE[h % CRM_PALETTE.length];
}

/** Initials for an avatar chip. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
