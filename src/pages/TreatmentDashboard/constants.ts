import type { TreatmentDailyLog } from '../../lib/supabase';

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DONUT_COLORS = ['#10b981','#059669','#047857','#065f46','#064e3b','#022c22'];

export type Period = 'day' | 'month' | 'year';

export interface BarDatum {
  log: TreatmentDailyLog | null;
  label: string;
  dayKg: number;
  aftKg: number;
  nightKg: number;
  total: number;
  hasDowntime: boolean;
  isFuture?: boolean;
}

export function categorizeDowntime(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('power') || r.includes('no power')) return 'Power Outage';
  if (r.includes('shaft') || r.includes('chain') || r.includes('sprocket') || r.includes('blade')) return 'Mechanical Failure';
  if (r.includes('shredder') || r.includes('clog') || r.includes('blocked') || r.includes('incline')) return 'Equipment Blockage';
  if (r.includes('wors') || r.includes('stopper') || r.includes('conveyor')) return 'Wors Stopper / Conveyor';
  if (r.includes('pump') || r.includes('stirrer') || r.includes('sweeper')) return 'Equipment Repair';
  if (r.includes('roro') || r.includes('ro-bin')) return 'Waiting for RORO Bin';
  if (r.includes('waste') && (r.includes('no ') || r.includes('ran out') || r.includes('cleared'))) return 'No Waste Available';
  if (r.includes('install') || r.includes('maintenance') || r.includes('upgrade')) return 'Maintenance / Upgrades';
  if (r.includes('easter') || r.includes('sunday') || r.includes('everyone off')) return 'Non-Operating Day';
  if (r.includes('civil')) return 'Civil Works';
  return 'Other';
}
