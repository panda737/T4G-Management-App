import { useNavigate } from 'react-router-dom';
import { Factory, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import type { Washing } from './constants';

export interface YesterdayLog {
  kg: number; cycles: number; chemicalLitres: number; downtimeMinutes: number;
  dayShiftCycles: number; dayShiftKg: number;
  afternoonShiftCycles: number; afternoonShiftKg: number;
  nightShiftCycles: number; nightShiftKg: number;
  washing: Washing;
}

interface PlantPerformanceHeroProps {
  yesterdayLog: YesterdayLog | null;
  treatmentToday: { kg: number; cycles: number };
  yesterdayLabel: string;
  monthWashing: Washing;
}

const fmtWash = (w: Washing) => `RUC ${w.ruc.toLocaleString()} · Lids ${w.lids.toLocaleString()} · Bins ${w.bins.toLocaleString()}`;
const hasWash = (w: Washing) => w.ruc > 0 || w.lids > 0 || w.bins > 0;

export default function PlantPerformanceHero({ yesterdayLog, treatmentToday, yesterdayLabel, monthWashing }: PlantPerformanceHeroProps) {
  const navigate = useNavigate();
  const todaySubmitted = treatmentToday.cycles > 0 || treatmentToday.kg > 0;
  const hasYesterdayData = yesterdayLog && (yesterdayLog.kg > 0 || yesterdayLog.cycles > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-8">

        {/* Left — Yesterday's plant performance */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600"><Factory size={16} /></div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Yesterday's Plant Performance</h2>
              <p className="text-xs text-gray-400">{yesterdayLabel}</p>
            </div>
          </div>

          {hasYesterdayData ? (
            <>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {yesterdayLog!.kg.toLocaleString()} kg
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-lg font-bold text-cyan-600">{yesterdayLog!.cycles} cycles</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                <span>Day: <strong className="text-gray-800">{yesterdayLog!.dayShiftCycles}c</strong> ({yesterdayLog!.dayShiftKg.toLocaleString()} kg)</span>
                <span className="text-gray-200">·</span>
                <span>Aft: <strong className="text-gray-800">{yesterdayLog!.afternoonShiftCycles}c</strong> ({yesterdayLog!.afternoonShiftKg.toLocaleString()} kg)</span>
                <span className="text-gray-200">·</span>
                <span>Night: <strong className="text-gray-800">{yesterdayLog!.nightShiftCycles}c</strong> ({yesterdayLog!.nightShiftKg.toLocaleString()} kg)</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {yesterdayLog!.chemicalLitres > 0 && (
                  <span className="text-gray-500">Chemical: <strong className="text-gray-700">{yesterdayLog!.chemicalLitres.toLocaleString()} L</strong></span>
                )}
                {yesterdayLog!.downtimeMinutes > 0 ? (
                  <span className="text-amber-600">Downtime: <strong>{yesterdayLog!.downtimeMinutes >= 60 ? `${(yesterdayLog!.downtimeMinutes / 60).toFixed(1)}h` : `${yesterdayLog!.downtimeMinutes} min`}</strong></span>
                ) : (
                  <span className="text-emerald-600 font-medium">No downtime</span>
                )}
              </div>
              {hasWash(yesterdayLog!.washing) && (
                <p className="text-xs text-gray-500 mt-1.5">Washed: <strong className="text-gray-700">{fmtWash(yesterdayLog!.washing)}</strong></p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">No log recorded for yesterday.</p>
          )}

          {hasWash(monthWashing) && (
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
              This month washed: <strong className="text-gray-600">{fmtWash(monthWashing)}</strong>
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-gray-100 self-stretch" />
        <div className="sm:hidden h-px bg-gray-100 w-full" />

        {/* Right — Today's log status */}
        <div className="sm:w-48 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Today's Log</p>
          {todaySubmitted ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-emerald-700">Submitted</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span><strong className="text-gray-900">{treatmentToday.kg.toLocaleString()}</strong> kg</span>
                <span>·</span>
                <span><strong className="text-gray-900">{treatmentToday.cycles}</strong> cycles</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-700">Not yet submitted</span>
              </div>
              <button
                onClick={() => navigate('/treatment/daily-log')}
                className="flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
              >
                Submit log <ArrowRight size={12} />
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
