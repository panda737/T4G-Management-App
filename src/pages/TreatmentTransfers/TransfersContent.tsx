import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2, Truck, X } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { fmtKgCompact as fmtKg, fmtMonth } from '../../lib/formatters';
import { CATEGORY_COLORS, FACILITY_COLORS, type TransferWithDate } from './constants';

const PAGE_SIZE = 10;

interface TransfersContentProps {
  transfers: TransferWithDate[];
  byCategory: [string, number][];
  byFacility: [string, number][];
  totalKg: number;
  monthFilter: string;
  isAdmin?: boolean;
  onEdit?: (t: TransferWithDate) => void;
  onDelete?: (t: TransferWithDate) => void;
}

export default function TransfersContent({
  transfers, byCategory, byFacility, totalKg, monthFilter,
  isAdmin, onEdit, onDelete,
}: TransfersContentProps) {
  const [facilityFilter, setFacilityFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const facilities = Array.from(new Set(transfers.map(t => t.destination).filter(Boolean))).sort();

  const filtered = facilityFilter
    ? transfers.filter(t => t.destination === facilityFilter)
    : transfers;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function selectFacility(fac: string) {
    setFacilityFilter(prev => prev === fac ? null : fac);
    setPage(1);
  }

  function clearFacility() {
    setFacilityFilter(null);
    setPage(1);
  }

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <Truck size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">
            {monthFilter ? fmtMonth(monthFilter) : 'All Time'} — Untreated Waste Transferred Out
          </span>
        </div>
        <p className="text-3xl font-bold">{fmtKg(totalKg)} kg</p>
        <p className="text-xs opacity-70 mt-1">{transfers.length} transfer{transfers.length !== 1 ? 's' : ''} recorded</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">By Waste Stream</h2>
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
          <h2 className="text-sm font-semibold text-gray-900 mb-4">By Facility</h2>
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

      {/* Facility filter pills */}
      {facilities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Filter by facility:</span>
          {facilities.map(fac => {
            const active = facilityFilter === fac;
            const color = FACILITY_COLORS[fac] || '#6b7280';
            return (
              <button
                key={fac}
                onClick={() => selectFacility(fac)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? 'text-white shadow-sm border-transparent'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:shadow-sm'
                }`}
                style={active ? { backgroundColor: color, borderColor: color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : color }}
                />
                {fac}
                {active && <X size={11} className="ml-0.5 opacity-80" />}
              </button>
            );
          })}
          {facilityFilter && (
            <button
              onClick={clearFacility}
              className="text-xs text-gray-400 hover:text-gray-700 underline ml-1 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Transfer Records</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {facilityFilter
                ? `Showing transfers to ${facilityFilter}`
                : 'Untreated medical waste collected and sent to external treatment facilities'}
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

            {/* Pagination */}
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
