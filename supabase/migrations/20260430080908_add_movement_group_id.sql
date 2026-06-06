/*
  # Add movement_group_id to stock_movements

  Groups individual line items from the same Stock In / Stock Out order together,
  so they can be displayed as a single summary row in the movements list.
  Also adds movement_group_label for a human-readable order description.

  1. Changes
    - `stock_movements.movement_group_id` (uuid, nullable) — shared across all rows from the same order/event
    - `stock_movements.movement_group_label` (text) — e.g. "Stock In · PO-001 · 3 items"
  2. No data loss — existing rows remain, group_id stays null for legacy rows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements' AND column_name = 'movement_group_id'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN movement_group_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements' AND column_name = 'movement_group_label'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN movement_group_label text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_movements_group_id ON stock_movements(movement_group_id);

/*
  Also add a corrections_applied_at timestamp to stock_take_sessions
  so we can detect if corrections have already been applied.
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_take_sessions' AND column_name = 'corrections_applied_at'
  ) THEN
    ALTER TABLE stock_take_sessions ADD COLUMN corrections_applied_at timestamptz;
  END IF;
END $$;
