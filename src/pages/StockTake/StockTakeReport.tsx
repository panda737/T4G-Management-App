import { useEffect, useState, useMemo, useRef } from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { StockTakeSession, StockTakeLineItem } from '../../lib/supabase';
import { STATUS_STYLE, sortedCategories, groupByCategory } from './constants';
import { PageSpinner } from '../../components/Spinner';

export default function StockTakeReport({ session, onBack }: { session: StockTakeSession; onBack: () => void }) {
  const [lines, setLines] = useState<StockTakeLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('stock_take_line_items')
        .select('*')
        .eq('stock_take_session_id', session.id)
        .order('category')
        .order('description');
      setLines(data || []);
      setLoading(false);
    })();
  }, [session.id]);

  function handlePrint() {
    window.print();
  }

  function handleExcelDownload() {
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const numCell = (v: number | string) => typeof v === 'number' ? `<Cell ss:StyleID="num"><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell ss:StyleID="plain"><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const strCell = (v: string, style = 'plain') => `<Cell ss:StyleID="${style}"><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const boldCell = (v: string) => strCell(v, 'bold');
    const row = (...cells: string[]) => `<Row>${cells.join('')}</Row>`;
    const emptyRow = () => `<Row/>`;

    const dataRows = lines.map(l => {
      const v = l.counted_quantity !== null ? l.counted_quantity - l.system_quantity : null;
      const status = l.counted_quantity === null ? 'Not counted' : v === 0 ? 'Match' : v! > 0 ? 'Surplus' : 'Shortage';
      const varStyle = v === null ? 'plain' : v > 0 ? 'pos' : v < 0 ? 'neg' : 'plain';
      return row(
        strCell(l.stock_code || ''),
        strCell(l.description || l.stock_item || ''),
        strCell(l.category),
        numCell(l.system_quantity),
        l.counted_quantity !== null ? numCell(l.counted_quantity) : strCell(''),
        v !== null ? `<Cell ss:StyleID="${varStyle}"><Data ss:Type="Number">${v}</Data></Cell>` : strCell(''),
        strCell(status),
        strCell(l.comment || ''),
      );
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
  <Style ss:ID="plain"/>
  <Style ss:ID="bold"><Font ss:Bold="1"/></Style>
  <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1F2937" ss:Pattern="Solid"/></Style>
  <Style ss:ID="meta"><Font ss:Bold="1" ss:Color="#065F46"/></Style>
  <Style ss:ID="num"><NumberFormat ss:Format="0"/></Style>
  <Style ss:ID="pos"><Font ss:Bold="1" ss:Color="#065F46"/><NumberFormat ss:Format='"+0;-0;0"'/></Style>
  <Style ss:ID="neg"><Font ss:Bold="1" ss:Color="#991B1B"/><NumberFormat ss:Format='"+0;-0;0"'/></Style>
</Styles>
<Worksheet ss:Name="Stock Take Report">
<Table>
  <Column ss:Width="80"/>
  <Column ss:Width="220"/>
  <Column ss:Width="140"/>
  <Column ss:Width="80"/>
  <Column ss:Width="80"/>
  <Column ss:Width="70"/>
  <Column ss:Width="90"/>
  <Column ss:Width="180"/>
  ${row(strCell('Stock Take Report', 'bold'), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''))}
  ${row(strCell('Session', 'meta'), strCell(session.stock_take_name), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''))}
  ${row(strCell('Date', 'meta'), strCell(new Date(session.stock_take_date).toLocaleDateString()), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''))}
  ${row(strCell('Conducted By', 'meta'), strCell(session.conducted_by || ''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''))}
  ${row(strCell('Approved By', 'meta'), strCell(session.approved_by || ''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''))}
  ${row(strCell('Status', 'meta'), strCell(session.status), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''), strCell(''))}
  ${emptyRow()}
  ${row(boldCell('Code'), boldCell('Description'), boldCell('Category'), boldCell('System Qty'), boldCell('Actual Qty'), boldCell('Variance'), boldCell('Status'), boldCell('Comment')).replace(/ss:StyleID="bold"/g, 'ss:StyleID="header"')}
  ${dataRows.join('\n  ')}
</Table>
</Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.stock_take_name.replace(/[^a-z0-9]/gi, '_')}_report.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const grouped = useMemo(() => groupByCategory(lines), [lines]);
  const cats = useMemo(() => sortedCategories(grouped), [grouped]);

  const counted = lines.filter(l => l.counted_quantity !== null);
  const withVariance = counted.filter(l => l.variance !== 0);
  const shortages = withVariance.filter(l => l.variance < 0);
  const surpluses = withVariance.filter(l => l.variance > 0);
  const totalVariance = withVariance.reduce((s, l) => s + l.variance, 0);

  const fmt = (n: number) => n > 0 ? `+${n}` : String(n);

  if (loading) return (
    <PageSpinner />
  );

  return (
    <div className="space-y-4">
      {/* Screen toolbar -- hidden when printing */}
      <div className="print:hidden flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 mb-2 transition-colors">
            <ArrowLeft size={13} /> Back to count sheet
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Stock Take Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">{session.stock_take_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExcelDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Download size={15} /> Download Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report body */}
      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 shadow-sm print:shadow-none print:rounded-none print:border-0">

        {/* Report header */}
        <div className="px-8 py-6 border-b-2 border-gray-800 print:px-6 print:py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Take Report</p>
              <h2 className="text-2xl font-bold text-gray-900">{session.stock_take_name}</h2>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                <span><strong>Date:</strong> {new Date(session.stock_take_date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                {session.conducted_by && <span><strong>Conducted by:</strong> {session.conducted_by}</span>}
                {session.approved_by && <span><strong>Approved by:</strong> {session.approved_by}</span>}
                {session.approved_at && <span><strong>Approved:</strong> {new Date(session.approved_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <span className={`text-xs px-3 py-1 rounded font-semibold ${STATUS_STYLE[session.status] || STATUS_STYLE.Draft}`}>
              {session.status}
            </span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-8 py-5 border-b border-gray-200 print:px-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Summary</p>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total Items', value: lines.length, color: 'text-gray-900' },
              { label: 'Items Counted', value: counted.length, color: 'text-emerald-700' },
              { label: 'Variances', value: withVariance.length, color: withVariance.length > 0 ? 'text-amber-600' : 'text-gray-400' },
              { label: 'Shortages', value: shortages.length, color: shortages.length > 0 ? 'text-red-600' : 'text-gray-400' },
              { label: 'Surpluses', value: surpluses.length, color: surpluses.length > 0 ? 'text-emerald-600' : 'text-gray-400' },
            ].map(c => (
              <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full items table */}
        <div className="px-8 py-5 print:px-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Full Count -- All Items</p>
          {cats.map(cat => {
            const catLines = grouped[cat];
            const catVariance = catLines.filter(l => l.counted_quantity !== null && l.variance !== 0);
            return (
              <div key={cat} className="mb-5 print:mb-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest px-2">{cat}</span>
                  <div className="flex-1 h-px bg-gray-800" />
                  {catVariance.length > 0 && (
                    <span className="text-xs text-amber-600 font-semibold">{catVariance.length} variance{catVariance.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider w-24">Code</th>
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider">Description</th>
                      <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-24">System Qty</th>
                      <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-24">Actual Qty</th>
                      <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-24">Variance</th>
                      <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-20">Status</th>
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {catLines.map((line, idx) => {
                      const v = line.counted_quantity !== null ? line.counted_quantity - line.system_quantity : null;
                      const notCounted = line.counted_quantity === null;
                      return (
                        <tr key={line.id} className={`${notCounted ? 'bg-gray-50/60' : v !== 0 ? (idx % 2 === 0 ? 'bg-amber-50' : 'bg-amber-50/70') : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}`}>
                          <td className="px-3 py-1.5 font-mono text-gray-500">{line.stock_code || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-800 leading-snug">
                            {line.description?.replace(/\s*\([^)]*\)\s*$/, '').trim() || line.stock_item}
                          </td>
                          <td className="px-3 py-1.5 text-center font-semibold text-gray-700">{line.system_quantity}</td>
                          <td className="px-3 py-1.5 text-center font-semibold text-gray-800">
                            {line.counted_quantity !== null ? line.counted_quantity : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {v !== null ? (
                              <span className={`font-bold ${v > 0 ? 'text-emerald-700' : v < 0 ? 'text-red-700' : 'text-gray-400'}`}>
                                {v > 0 ? `+${v}` : v === 0 ? '—' : v}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {notCounted ? (
                              <span className="text-gray-400 italic">Not counted</span>
                            ) : v === 0 ? (
                              <span className="text-emerald-600 font-semibold">Match</span>
                            ) : v! > 0 ? (
                              <span className="text-emerald-700 font-semibold">Surplus</span>
                            ) : (
                              <span className="text-red-600 font-semibold">Shortage</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">{line.comment || ''}</td>
                        </tr>
                      );
                    })}
                    {catVariance.length > 0 && (
                      <tr className="bg-gray-100 border-t border-gray-300">
                        <td colSpan={4} className="px-3 py-1.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">Category variance total</td>
                        <td className="px-3 py-1.5 text-center font-bold text-gray-800">
                          {fmt(catVariance.reduce((s, l) => s + l.variance, 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Variance-only summary */}
        {withVariance.length > 0 && (
          <div className="px-8 pb-8 print:px-6 print:pb-6">
            <div className="border-t-2 border-gray-800 pt-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Variance Summary -- Items with Differences Only</p>
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider w-24">Code</th>
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider">Description</th>
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider w-36">Category</th>
                    <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-24">System Qty</th>
                    <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-24">Actual Qty</th>
                    <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-24">Variance</th>
                    <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-20">Type</th>
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withVariance.map((line, idx) => (
                    <tr key={line.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{line.stock_code || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-800">{line.description?.replace(/\s*\([^)]*\)\s*$/, '').trim() || line.stock_item}</td>
                      <td className="px-3 py-1.5 text-gray-600">{line.category}</td>
                      <td className="px-3 py-1.5 text-center font-semibold text-gray-700">{line.system_quantity}</td>
                      <td className="px-3 py-1.5 text-center font-semibold text-gray-800">{line.counted_quantity}</td>
                      <td className="px-3 py-1.5 text-center font-bold">
                        <span className={line.variance > 0 ? 'text-emerald-700' : 'text-red-700'}>{fmt(line.variance)}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`font-semibold ${line.variance > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {line.variance > 0 ? 'Surplus' : 'Shortage'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{line.comment || ''}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-800 text-white">
                    <td colSpan={5} className="px-3 py-2 font-bold text-right text-xs uppercase tracking-wide">Net Variance Total</td>
                    <td className="px-3 py-2 text-center font-bold text-base">
                      <span className={totalVariance > 0 ? 'text-emerald-300' : totalVariance < 0 ? 'text-red-300' : 'text-gray-300'}>
                        {fmt(totalVariance)}
                      </span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report footer */}
        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 print:px-6 rounded-b-xl print:rounded-none">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Generated: {new Date().toLocaleString()}</span>
            {session.notes && <span className="text-gray-500 italic">{session.notes}</span>}
            <span>Status: {session.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
