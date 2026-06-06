/** Formats kg with thousands separator; values >= 1M show as "1.2M". */
export function fmtKgCompact(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  return n.toFixed(n % 1 !== 0 ? 1 : 0);
}

/** Formats kg as tons when >= 1000 (e.g. "1.2 t"), otherwise raw kg. */
export function fmtKgTons(n: number): string {
  if (n >= 1000) return (n / 1000).toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' t';
  return n.toFixed(n % 1 !== 0 ? 1 : 0);
}

/** Always formats in kg with thousand separator -- used for single-day views. */
export function fmtKgRaw(n: number): string {
  return Math.round(n).toLocaleString('en-ZA') + ' kg';
}

/** Formats a YYYY-MM string as "Jan 2026". */
export function fmtMonth(monthStr: string): string {
  const [y, mo] = monthStr.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[mo - 1]} ${y}`;
}
