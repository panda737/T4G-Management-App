import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { INCREASE_TYPES, DECREASE_TYPES } from './constants';

export function MovementIcon({ type, size = 12 }: { type: string; size?: number }) {
  if (INCREASE_TYPES.includes(type)) return <ArrowDown size={size} className="text-emerald-600" />;
  if (DECREASE_TYPES.includes(type)) return <ArrowUp size={size} className="text-red-600" />;
  return <Minus size={size} className="text-amber-600" />;
}
