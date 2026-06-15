export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => JSON.stringify(v == null ? '' : String(v));
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardened CSV for customer-facing exports:
//   • UTF-8 BOM so Excel renders accented site names correctly
//   • CRLF line endings (Excel/Windows friendly)
//   • spreadsheet formula-injection neutralisation for text cells (=, +, -, @, tab, CR)
//   • raw numeric values left unquoted/unformatted for exact reconciliation
//   • object keys are used verbatim as the (human-readable) header row
// Returns false when there are no rows (caller can show a clean empty-state).
// ─────────────────────────────────────────────────────────────────────────────
function csvText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;            // neutralise formula injection
  return `"${s.replace(/"/g, '""')}"`;                 // quote + escape
}

function csvHeader(h: string): string {
  const s = /^[=+\-@\t\r]/.test(h) ? `'${h}` : h;
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsvSafe(rows: Record<string, unknown>[], filename: string): boolean {
  if (rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  const eol = '\r\n';
  const head = headers.map(csvHeader).join(',');
  const body = rows.map(r => headers.map(h => csvText(r[h])).join(',')).join(eol);
  const csv = `﻿${head}${eol}${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
