/*
  # Add missing indexes on stock tables

  The stock tables were created without indexes beyond the primary key.
  All other modules (safety, training, maintenance, employees) already have
  proper indexes. This migration brings the stock tables up to the same standard.

  ## Indexes added

  ### stock_items
  - (active)   — almost every query filters WHERE active = true
  - (category) — dashboard and master list group/filter by category

  ### stock_movements
  - (stock_item_id) — FK lookup; joins to stock_items on every movement query
  - (created_at)    — dashboard monthly count filters on this column
  - (movement_date) — movement list queries order/filter by movement_date
  - (movement_type) — filtered views (Issued, Received, etc.)

  ### stock_take_sessions
  - (status) — list views filter by Draft / In Progress / Completed

  ### stock_take_line_items
  - (stock_take_session_id) — FK; every line item query scopes to a session
  - (stock_item_id)         — FK; reverse lookup from item to count history
*/

-- stock_items
CREATE INDEX IF NOT EXISTS idx_stock_items_active
  ON stock_items (active);

CREATE INDEX IF NOT EXISTS idx_stock_items_category
  ON stock_items (category);

-- stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_item_id
  ON stock_movements (stock_item_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
  ON stock_movements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date
  ON stock_movements (movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type
  ON stock_movements (movement_type);

-- stock_take_sessions
CREATE INDEX IF NOT EXISTS idx_stock_take_sessions_status
  ON stock_take_sessions (status);

-- stock_take_line_items
CREATE INDEX IF NOT EXISTS idx_stock_take_line_items_session_id
  ON stock_take_line_items (stock_take_session_id);

CREATE INDEX IF NOT EXISTS idx_stock_take_line_items_stock_item_id
  ON stock_take_line_items (stock_item_id);
