import type { TreatmentWasteTransfer } from '../../lib/supabase';

export const WASTE_CATEGORIES = ['Infectious', 'Sharps', 'Anatomical', 'Pharmaceutical', 'Cytotoxic', 'Clinical Glass', 'PVC', 'Other'];
export const TRANSFER_DESTINATIONS = ['A-Thermal', 'Averda City Deep', 'Averda Klerksdorp', 'Biomed', 'ClinX', 'Holfontein'];

export const CATEGORY_COLORS: Record<string, string> = {
  Infectious: '#10b981',
  Sharps: '#f59e0b',
  Anatomical: '#ef4444',
  Pharmaceutical: '#a855f7',
  Cytotoxic: '#ec4899',
  'Clinical Glass': '#0ea5e9',
  PVC: '#f97316',
  Other: '#6b7280',
};

export const FACILITY_COLORS: Record<string, string> = {
  'A-Thermal': '#10b981',
  'Averda City Deep': '#059669',
  'Averda Klerksdorp': '#14b8a6',
  'Biomed': '#047857',
  'ClinX': '#065f46',
  'Holfontein': '#064e3b',
};

export type TransferWithDate = TreatmentWasteTransfer & { log_date?: string };
export type DailyLogRef = { id: string; date: string };
export type ActiveTab = 'Transfers' | 'Landfill';
