import { DONUT_COLORS } from './constants';

export default function DowntimePanel({ downtimeBreakdown }: {
  downtimeBreakdown: [string, number][];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Downtime Reasons</h2>
      {downtimeBreakdown.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No downtime this period</p>
      ) : (
        <div className="space-y-3">
          {downtimeBreakdown.map(([reason, count], i) => {
            const max = downtimeBreakdown[0][1];
            const pct = (count / max) * 100;
            return (
              <div key={reason}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-700 font-medium">{reason}</span>
                  <span className="text-xs text-gray-500">{count} day{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
