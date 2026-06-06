const FALLBACK = 'bg-gray-100 text-gray-700';

function lookup(map: Record<string, string>, value: string): string {
  return map[value] || FALLBACK;
}

export const equipmentStatusColors: Record<string, string> = {
  Operational: 'bg-emerald-100 text-emerald-700',
  'Under Maintenance': 'bg-amber-100 text-amber-700',
  Faulty: 'bg-red-100 text-red-700',
  Decommissioned: 'bg-gray-100 text-gray-400',
};

export const maintenanceTypeColors: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Corrective: 'bg-orange-100 text-orange-700',
  Preventive: 'bg-sky-100 text-sky-700',
  Emergency: 'bg-red-100 text-red-700',
};

export const severityColors: Record<string, string> = {
  Minor: 'bg-emerald-100 text-emerald-700',
  Moderate: 'bg-amber-100 text-amber-700',
  Serious: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

export const incidentStatusColors: Record<string, string> = {
  Open: 'bg-amber-100 text-amber-700',
  'Under Investigation': 'bg-sky-100 text-sky-700',
  'Corrective Action': 'bg-orange-100 text-orange-700',
  Closed: 'bg-emerald-100 text-emerald-700',
};

export const priorityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

export const riskLevelColors: Record<string, string> = {
  Low: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Extreme: 'bg-red-100 text-red-700',
};

export const riskAssessmentStatusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Draft: 'bg-gray-100 text-gray-700',
  Archived: 'bg-gray-100 text-gray-700',
};

export function getRiskRatingColor(rating: number): string {
  if (rating <= 4) return 'bg-emerald-100 text-emerald-700';
  if (rating <= 9) return 'bg-amber-100 text-amber-700';
  if (rating <= 14) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

export const drillStatusColors: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-800',
  Completed: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-gray-100 text-gray-800',
};

export const inspectionStatusColors: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-800',
  'Requires Action': 'bg-amber-100 text-amber-800',
  Scheduled: 'bg-sky-100 text-sky-800',
};

export const trainingResultColors: Record<string, string> = {
  Pass: 'bg-emerald-100 text-emerald-700',
  Fail: 'bg-red-100 text-red-700',
  Incomplete: 'bg-gray-100 text-gray-700',
};

export const trainingStatusColors: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Due: 'bg-amber-100 text-amber-700',
  Overdue: 'bg-red-100 text-red-700',
  'In Progress': 'bg-sky-100 text-sky-700',
};

export function badgeColor(map: Record<string, string>, value: string): string {
  return lookup(map, value);
}
