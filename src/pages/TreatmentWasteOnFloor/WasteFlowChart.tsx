import { fmtKgCompact as fmtKg } from '../../lib/formatters';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_ABBR[Number(m) - 1]} '${y.slice(2)}`;
}

export interface FlowDatum {
  month: string;   // YYYY-MM
  inKg: number;    // received
  outKg: number;   // treated + transferred
  balance: number; // running on-floor (floored at 0 for display)
}

const COL_W = 64;
const BAR_W = 16;
const CHART_H = 200;
const PAD_T = 12;
const PAD_B = 30;
const PAD_L = 48;
const PAD_R = 12;

export default function WasteFlowChart({ data }: { data: FlowDatum[] }) {
  const width = PAD_L + data.length * COL_W + PAD_R;
  const height = PAD_T + CHART_H + PAD_B;
  const yMax = Math.max(1, ...data.flatMap(d => [d.inKg, d.outKg, Math.max(0, d.balance)]));
  const yOf = (v: number) => PAD_T + CHART_H - (Math.max(0, v) / yMax) * CHART_H;
  const colCenter = (i: number) => PAD_L + i * COL_W + COL_W / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * yMax);
  const baseY = PAD_T + CHART_H;
  const linePts = data.map((d, i) => `${colCenter(i)},${yOf(Math.max(0, d.balance))}`).join(' ');

  return (
    <div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD_L} x2={width - PAD_R} y1={yOf(t)} y2={yOf(t)} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PAD_L - 6} y={yOf(t) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{fmtKg(t)}</text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = colCenter(i);
            const inX = cx - BAR_W - 2;
            const outX = cx + 2;
            return (
              <g key={d.month}>
                <rect x={inX} y={yOf(d.inKg)} width={BAR_W} height={baseY - yOf(d.inKg)} rx={2} fill="#10b981">
                  <title>{`${monthLabel(d.month)} — In: ${fmtKg(d.inKg)} kg`}</title>
                </rect>
                <rect x={outX} y={yOf(d.outKg)} width={BAR_W} height={baseY - yOf(d.outKg)} rx={2} fill="#f97316">
                  <title>{`${monthLabel(d.month)} — Out: ${fmtKg(d.outKg)} kg`}</title>
                </rect>
                <text x={cx} y={baseY + 16} textAnchor="middle" fontSize={9} fill="#64748b">{monthLabel(d.month)}</text>
              </g>
            );
          })}

          <polyline points={linePts} fill="none" stroke="#0891b2" strokeWidth={2} />
          {data.map((d, i) => (
            <circle key={d.month} cx={colCenter(i)} cy={yOf(Math.max(0, d.balance))} r={3} fill="#0891b2" stroke="#fff" strokeWidth={1}>
              <title>{`${monthLabel(d.month)} — On floor: ${fmtKg(Math.max(0, d.balance))} kg`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 justify-center">
        <Legend color="#10b981" label="Received (in)" />
        <Legend color="#f97316" label="Treated + transferred (out)" />
        <Legend color="#0891b2" label="On-floor balance" line />
      </div>
    </div>
  );
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={line ? 'w-4 h-0.5 rounded-full' : 'w-2.5 h-2.5 rounded-sm'}
        style={{ backgroundColor: color }}
      />
      <span className="text-[11px] text-gray-600">{label}</span>
    </div>
  );
}
