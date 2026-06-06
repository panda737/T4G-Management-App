import DonutChart from '../../components/DonutChart';
import { fmtKgTons as fmtKg } from '../../lib/formatters';

interface ShiftStats {
  dayKg: number; aftKg: number; nightKg: number;
  dayCycles: number; aftCycles: number; nightCycles: number;
  totalKg: number;
}

function ShiftRow({ label, cycles, kg, color }: { label: string; cycles: number; kg: number; color: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium text-gray-700 flex-1">{label}</span>
      <span className="text-xs text-gray-500">{cycles} cycles</span>
      <span className="text-xs font-semibold text-gray-900 w-16 sm:w-20 text-right">{fmtKg(kg)}</span>
    </div>
  );
}

export default function ShiftDonut({ stats }: { stats: ShiftStats }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Shift Breakdown (Kg)</h2>
      <DonutChart
        segments={[
          { label: 'Day', value: stats.dayKg, color: '#059669' },
          { label: 'Afternoon', value: stats.aftKg, color: '#34d399' },
          { label: 'Night', value: stats.nightKg, color: '#a7f3d0' },
        ]}
        centerLabel={fmtKg(stats.totalKg)}
        centerSub="Total"
      />
      <div className="mt-4 space-y-2">
        <ShiftRow label="Day Shift" cycles={stats.dayCycles} kg={stats.dayKg} color="#059669" />
        <ShiftRow label="Afternoon" cycles={stats.aftCycles} kg={stats.aftKg} color="#34d399" />
        <ShiftRow label="Night Shift" cycles={stats.nightCycles} kg={stats.nightKg} color="#a7f3d0" />
      </div>
    </div>
  );
}
