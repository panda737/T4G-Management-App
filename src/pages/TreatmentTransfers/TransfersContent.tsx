import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2, Truck } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import MonthlyTrendChart from './MonthlyTrendChart';
import { fmtKgCompact as fmtKg } from '../../lib/formatters';
import { CATEGORY_COLORS, FACILITY_COLORS, WASTE_CATEGORIES, TRANSFER_DESTINATIONS, type TransferWithDate } from './constants';

const PAGE_SIZE = 10;

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' }, { value: '04', label: 'April' },
  { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

interface TransfersContentProps {
  transfers: TransferWithDate[];
  trendTransfers: TransferWithDate[];
  periodLabel: string;
  isAdmin?: boolean;
  onEdit?: (t: TransferWithDate) => void;
  onDelete?: (t: TransferWithDate) => void;
}

export default function TransfersContent({
  transfers, trendTransfers, periodLabel,
  isAdmin, onEdit, onDelete,
}: TransfersContentProps) {
  const [streamFilter, setStreamFilter] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [stackBy, setStackBy] = useState<'stream' | 'facility'>('stream');
  const [trendYear, setTrendYear] = useState('');
  const [trendMonth, setTrendMonth] = useState('');
  const [page, setPage] = useState(1);

  const streamOptions = useMemo(() => {
    const present = new Set(transfers.map(t => t.waste_category).filter(Boolean));
    const ordered = WASTE_CATEGORIES.filter(c => present.has(c));
    const extras = [...present].filter(c => !WASTE_CATEGORIES.includes(c)).sort();
    return [...ordered, ...extras];
  }, [transfers]);
  const facilityOptions = useMemo(
    () => Array.from(new Set(transfers.map(t => t.destination).filter(Boolean))).sort(),
    [transfers],
  );

  const filtered = useMemo(
    () => transfers.filter(t =>
      (!streamFilter || t.waste_category === streamFilter) &&
      (!facilityFilter || t.destination === facilityFilter),
    ),
    [transfers, streamFilter, facilityFilter],
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => { map[t.waste_category] = (map[t.waste_category] || 0) + Number(t.quantity_kg); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byFacility = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => { map[t.destination] = (map[t.destination] || 0) + Number(t.quantity_kg); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const totalKg = useMemo(() => filtered.reduce((s, t) => s + Number(t.quantity_kg), 0), [filtered]);

  const trendYears = useMemo(
    () => Array.from(new Set(trendTransfers.map(t => t.log_date?.substring(0, 4)).filter(Boolean) as string[])).sort().reverse(),
    [trendTransfers],
  );

  const trend = useMemo(() => {
    const key = stackBy === 'stream' ? 'waste_category' : 'destination';
    const filt = trendTransfers.filter(t => {
      if (!t.log_date) return false;
      if (streamFilter && t.waste_category !== streamFilter) return false;
      if (facilityFilter && t.destination !== facilityFilter) return false;
      if (trendYear && t.log_date.substring(0, 4) !== trendYear) return false;
      if (trendMonth && t.log_date.substring(5, 7) !== trendMonth) return false;
      return true;
    });
    const byMonth: Record<string, Record<string, number>> = {};
    const keysPresent = new Set<string>();
    filt.forEach(t => {
      if (!t.log_date) return;
      const m = t.log_date.substring(0, 7);
      const k = t[key] as string;
      (byMonth[m] ||= {});
      byMonth[m][k] = (byMonth[m][k] || 0) + Number(t.quantity_kg);
      keysPresent.add(k);
    });
    const data = Object.keys(byMonth).sort().map(m => {
      const segments = byMonth[m];
      return { month: m, segments, total: Object.values(segments).reduce((s, v) => s + v, 0) };
    });
    const orderRef = stackBy === 'stream' ? WASTE_CATEGORIES : TRANSFER_DESTINATIONS;
    const stackKeys = [
      ...orderRef.filter(k => keysPresent.has(k)),
      ...[...keysPresent].filter(k => !orderRef.includes(k)).sort(),
    ];
    return { data, stackKeys };
  }, [trendTransfers, streamFilter, facilityFilter, stackBy, trendYear, trendMonth]);

  const trendColors = stackBy === 'stream' ? CATEGORY_COLORS : FACILITY_COLORS;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectCls = 'appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer';

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <Truck size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">
            {periodLabel} — Untreated Waste Transferred Out
          </span>
        </div>
        <p className="text-3xl font-bold">{fmtKg(totalKg)} kg</p>
        <p className="text-xs opacity-70 mt-1">{filtered.length} transfer{filtered.length !== 1 ? 's' : ''} recorded</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-900">By Waste Stream</h2>
            <select
              value={streamFilter}
              onChange={e => { setStreamFilter(e.target.value); setPage(1); }}
              className={selectCls}
            >
              <option value="">All Streams</option>
              {streamOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {byCategory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transfers recorded</p>
          ) : (
            <>
              <DonutChart
                segments={byCategory.map(([cat, kg]) => ({ label: cat, value: kg, color: CATEGORY_COLORS[cat] || '#6b7280' }))}
                centerLabel={fmtKg(totalKg)}
                centerSub="Total"
              />
              <div className="mt-4 space-y-2">
                {byCategory.map(([cat, kg]) => (
                  <div key={cat} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }} />
                    <span className="text-xs font-medium text-gray-700 flex-1">{cat}</span>
                    <span className="text-xs font-semibold text-gray-900">{fmtKg(kg)} kg</span>
                    <span className="text-[10px] text-gray-400 w-10 text-right">{totalKg > 0 ? ((kg / totalKg) * 100).toFixed(0) : 0}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-900">By Facility</h2>
            <select
              value={facilityFilter}
              onChange={e => { setFacilityFilter(e.target.value); setPage(1); }}
              className={selectCls}
            >
              <option value="">All Facilities</option>
              {facilityOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {byFacility.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transfers recorded</p>
          ) : (
            <>
              <DonutChart
                segments={byFacility.map(([fac, kg]) => ({ label: fac, value: kg, color: FACILITY_COLORS[fac] || '#6b7280' }))}
                centerLabel={fmtKg(totalKg)}
                centerSub="Total"
              />
              <div className="mt-4 space-y-2">
                {byFacility.map(([fac, kg]) => (
                  <div key={fac} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: FACILITY_COLORS[fac] || '#6b7280' }} />
                    <span className="text-xs font-medium text-gray-700 flex-1">{fac}</span>
                    <span className="text-xs font-semibold text-gray-900">{fmtKg(kg)} kg</span>
                    <span className="text-[10px] text-gray-400 w-10 text-right">{totalKg > 0 ? ((kg / totalKg) * 100).toFixed(0) : 0}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {trend.data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Monthly Trend</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                kg transferred per month{trend.data.length > 1 ? ' — compare month to month' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <select value={trendYear} onChange={e => setTrendYear(e.target.value)} className={selectCls}>
                <option value="">All Years</option>
                {trendYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={trendMonth} onChange={e => setTrendMonth(e.target.value)} className={selectCls}>
                <option value="">All Months</option>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                {([['stream', 'By Stream'], ['facility', 'By Facility']] as const).map(([opt, label]) => (
                  <button
                    key={opt}
                    onClick={() => setStackBy(opt)}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      stackBy === opt ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <MonthlyTrendChart data={trend.data} stackKeys={trend.stackKeys} colors={trendColors} />
        </div>
      )}

      {(streamFilter || facilityFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Active filters:</span>
          {streamFilter && (
            <button
              onClick={() => { setStreamFilter(''); setPage(1); }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              Stream: {streamFilter} ✕
            </button>
          )}
          {facilityFilter && (
            <button
              onClick={() => { setFacilityFilter(''); setPage(1); }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              Facility: {facilityFilter} ✕
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Transfer Records</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Untreated medical waste collected and sent to external treatment facilities
            </p>
          </div>
          {filtered.length > 0 && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No transfers recorded</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Waste Stream</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Quantity (kg)</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Facility</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Manifest #</th>
                    {isAdmin && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paged.map((t, idx) => (
                    <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-emerald-50/30 transition-colors group`}>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">
                        {t.log_date ? new Date(t.log_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[t.waste_category] || '#6b7280' }} />
                          <span className="text-gray-700">{t.waste_category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {Number(t.quantity_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{t.destination}</td>
                      <td className="px-4 py-3 text-gray-500">{t.manifest_number || '--'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => onEdit?.(t)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => onDelete?.(t)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {paged.map((t, idx) => (
                <div key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} p-4`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="font-medium text-gray-800 whitespace-nowrap">
                      {t.log_date ? new Date(t.log_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">Transfer Out</span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => onEdit?.(t)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => onDelete?.(t)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Waste Stream</p>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[t.waste_category] || '#6b7280' }} />
                        <span className="text-gray-700">{t.waste_category}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Quantity</p>
                      <p className="font-semibold text-gray-900">{Number(t.quantity_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Facility</p>
                      <p className="text-gray-700">{t.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Manifest #</p>
                      <p className="text-gray-700">{t.manifest_number || '--'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[28px] h-7 rounded text-xs font-medium transition-colors ${
                        p === safePage
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
