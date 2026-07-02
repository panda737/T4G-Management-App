import type { TreatmentMonthlySummary } from '../../lib/supabase';
import { fmtMonth } from '../../lib/formatters';

interface LandfillContentProps {
  records: TreatmentMonthlySummary[];
  totalTons: number;
  totalWaterTons: number;
  periodLabel: string;
  onEdit: (r: TreatmentMonthlySummary) => void;
}

function waterPctOf(wasteKg: number, waterKg: number): number {
  const denom = wasteKg + waterKg;
  return denom > 0 ? (waterKg / denom) * 100 : 0;
}

export default function LandfillContent({ records, totalTons, totalWaterTons, periodLabel, onEdit }: LandfillContentProps) {
  const overallWaterPct = waterPctOf(totalTons, totalWaterTons);
  return (
    <>
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <span className="text-xs font-medium uppercase tracking-wider">
            {periodLabel} — Treated Waste Dispatched to Landfill
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <p className="text-3xl font-bold">{totalTons.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tons</p>
            <p className="text-xs opacity-70 mt-1">Treated waste</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{totalWaterTons.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tons</p>
            <p className="text-xs opacity-70 mt-1">Water / liquid waste ({overallWaterPct.toFixed(1)}%)</p>
          </div>
        </div>
        <p className="text-xs opacity-70 mt-3">{records.length} month{records.length !== 1 ? 's' : ''} recorded — Mooiplaats Landfill</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Landfill Records</h2>
          <p className="text-xs text-gray-500 mt-0.5">Treated waste collected by us and dispatched to Mooiplaats Landfill — recorded per month</p>
        </div>
        {records.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No landfill records found</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Month</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Tons Sent</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Water (t)</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Water %</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Notes</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r, idx) => {
                    const wasteKg = Number(r.total_sent_for_landfill_kg);
                    const waterKg = Number(r.total_water_to_landfill_kg);
                    return (
                    <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-slate-50/50 transition-colors`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{fmtMonth(r.month.substring(0, 7))}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {(wasteKg / 1000).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {(waterKg / 1000).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {waterKg > 0 ? `${waterPctOf(wasteKg, waterKg).toFixed(1)}%` : '--'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.notes || '--'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => onEdit(r)} className="text-xs text-gray-400 hover:text-slate-600 font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {records.map((r, idx) => {
                const wasteKg = Number(r.total_sent_for_landfill_kg);
                const waterKg = Number(r.total_water_to_landfill_kg);
                return (
                <div key={r.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} p-4`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{fmtMonth(r.month.substring(0, 7))}</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {(wasteKg / 1000).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <span className="text-sm font-normal text-gray-500">tons</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{wasteKg.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg</p>
                      {waterKg > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Water: {(waterKg / 1000).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tons ({waterPctOf(wasteKg, waterKg).toFixed(1)}%)
                        </p>
                      )}
                      {r.notes && <p className="text-xs text-gray-500 mt-2">{r.notes}</p>}
                    </div>
                    <button onClick={() => onEdit(r)} className="text-xs text-slate-600 hover:text-slate-800 font-medium">
                      Edit
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
