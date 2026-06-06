export interface MonthlyTreatment {
  month: string;
  label: string;
  kg: number;
  cycles: number;
  activeDays: number;
  chemicalLitres: number;
  downtimeMinutes: number;
}

export interface StockByCategory {
  category: string;
  count: number;
  qty: number;
}

export interface RecentMovement {
  id: string;
  movement_type: string;
  quantity: number;
  movement_date: string;
  stock_items: { stock_item: string } | null;
}

export interface UpcomingEvent {
  id: string;
  date: string;
  label: string;
  type: 'drill' | 'inspection' | 'training';
}

export const MOVEMENT_COLORS: Record<string, string> = {
  'Stock Received': 'text-emerald-600 bg-emerald-50',
  'Stock Returned': 'text-emerald-600 bg-emerald-50',
  'Opening Stock': 'text-blue-600 bg-blue-50',
  'Stock Issued': 'text-red-600 bg-red-50',
  'Stock Damaged': 'text-red-600 bg-red-50',
  'Stock Adjusted': 'text-amber-600 bg-amber-50',
  'Stock Transferred': 'text-gray-600 bg-gray-100',
  'Stock Take Correction': 'text-cyan-600 bg-cyan-50',
};
