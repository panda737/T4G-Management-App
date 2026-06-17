/*
  # Site-based deliveries — add site_id / site_name to stock_orders

  ## Purpose
  Deliveries are made to an individual client SITE (generator facility), not to
  the client account as a whole. This adds an optional link from each order to a
  client_sites row plus a denormalized site_name snapshot (mirroring client_name).

  ## Backward compatibility
  Both columns are nullable / defaulted, so existing orders are left untouched
  (site_id NULL, site_name ''). New orders require a site at the UI layer; the
  column stays nullable so legacy rows remain valid. ON DELETE SET NULL means
  deleting a site won't delete its historical orders.

  No RLS changes: stock_orders policies already govern the table; adding columns
  needs no new policies. confirm_stock_order() reads %ROWTYPE and is unaffected.
*/

ALTER TABLE public.stock_orders
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_name text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_stock_orders_site ON public.stock_orders (site_id);
