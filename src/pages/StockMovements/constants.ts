import { MovementType } from '../../lib/supabase';
import { StockMovement } from '../../lib/supabase';

export const MOVEMENT_TYPES: MovementType[] = [
  'Opening Stock', 'Stock Received', 'Stock Issued', 'Stock Adjusted',
  'Stock Transferred', 'Stock Damaged', 'Stock Returned', 'Stock Take Correction',
];

export const INCREASE_TYPES = ['Opening Stock', 'Stock Received', 'Stock Returned'];
export const DECREASE_TYPES = ['Stock Issued', 'Stock Damaged'];
export const EITHER_TYPES = ['Stock Adjusted', 'Stock Transferred', 'Stock Take Correction'];

export type MovementWithItem = StockMovement & {
  movement_group_id?: string | null;
  movement_group_label?: string;
  stock_items?: { stock_item: string; description: string; current_quantity: number } | null;
};

export interface OrderGroup {
  groupId: string;
  isGroup: boolean;
  movementType: string;
  date: string;
  reference: string;
  supplierClient: string;
  capturedBy: string;
  label: string;
  itemCount: number;
  totalQty: number;
  lines: MovementWithItem[];
}

export function buildGroups(movements: MovementWithItem[]): OrderGroup[] {
  const byGroup = new Map<string, MovementWithItem[]>();
  movements.forEach(m => {
    const key = m.movement_group_id || m.id;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(m);
  });

  const groups: OrderGroup[] = [];
  byGroup.forEach((lines, key) => {
    const first = lines[0];
    const isGroup = !!first.movement_group_id;
    const totalQty = lines.reduce((s, l) => s + Math.abs(l.quantity), 0);
    groups.push({
      groupId: key,
      isGroup,
      movementType: first.movement_type,
      date: first.movement_date,
      reference: first.reference_number || '',
      supplierClient: first.supplier_client_department || '',
      capturedBy: first.captured_by || '',
      label: first.movement_group_label || first.movement_type,
      itemCount: lines.length,
      totalQty,
      lines,
    });
  });

  groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return groups;
}

export function directionColor(type: string) {
  if (INCREASE_TYPES.includes(type)) return { badge: 'text-emerald-700 bg-emerald-50 border border-emerald-200', icon: 'text-emerald-600', row: '' };
  if (DECREASE_TYPES.includes(type)) return { badge: 'text-red-700 bg-red-50 border border-red-200', icon: 'text-red-600', row: '' };
  return { badge: 'text-amber-700 bg-amber-50 border border-amber-200', icon: 'text-amber-600', row: '' };
}

export function qtySign(type: string, qty: number) {
  if (INCREASE_TYPES.includes(type)) return `+${Math.abs(qty)}`;
  if (DECREASE_TYPES.includes(type)) return `-${Math.abs(qty)}`;
  return qty >= 0 ? `+${qty}` : String(qty);
}
