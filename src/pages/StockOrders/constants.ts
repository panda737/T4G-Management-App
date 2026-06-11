import { StockOrder, StockOrderStatus, OrderSource } from '../../lib/supabase';

export const ORDER_STATUSES: StockOrderStatus[] = [
  'Open', 'Dispatched', 'Awaiting Confirmation', 'Completed', 'Cancelled',
];

export const ORDER_SOURCES: OrderSource[] = ['OrderCo', 'Email', 'Phone', 'Other'];

// Stepper: Loaded → Printed → Dispatched → POD Uploaded → Confirmed
export interface StepState {
  label: string;
  done: boolean;
  timestamp: string | null;
}

export function buildSteps(order: StockOrder): StepState[] {
  return [
    { label: 'Loaded', done: true, timestamp: order.created_at },
    { label: 'Downloaded', done: !!order.printed_at, timestamp: order.printed_at },
    { label: 'Dispatched', done: !!order.dispatched_at, timestamp: order.dispatched_at },
    { label: 'POD Uploaded', done: !!order.signed_note_uploaded_at, timestamp: order.signed_note_uploaded_at },
    { label: 'Confirmed', done: !!order.confirmed_at, timestamp: order.confirmed_at },
  ];
}

export const canEdit = (s: StockOrderStatus) => s === 'Open';
export const canPrint = (s: StockOrderStatus) => s !== 'Cancelled';
export const canDispatch = (s: StockOrderStatus) => s === 'Open';
export const canUpload = (s: StockOrderStatus) => s === 'Dispatched' || s === 'Awaiting Confirmation';
export const canConfirm = (s: StockOrderStatus) => s === 'Awaiting Confirmation';
export const canCancel = (s: StockOrderStatus) => s !== 'Completed' && s !== 'Cancelled';
