/*
  # Customer Orders & Delivery Notes — clients, stock_orders, stock_order_items

  ## Purpose
  Introduces the customer order / delivery note workflow:
    1. clients            — customer database selected when loading an order
    2. stock_orders       — one order = one delivery note (order_number = DN-YYYY-NNNN)
    3. stock_order_items  — order line items (snapshot of code/name at load time)
    4. delivery-notes     — private storage bucket for signed PODs

  ## Workflow / status lifecycle
    Open → Dispatched → Awaiting Confirmation → Completed   (+ Cancelled)
  Stock only moves when the order is confirmed via the confirm_stock_order()
  RPC (separate migration) — loading an order does NOT touch stock_items.

  ## Security
  RLS follows the stock module idiom (see 20260609000011):
    - SELECT: all authenticated users
    - INSERT/UPDATE/DELETE: public.can_write_stock() (admin/management/stock_controller)
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- clients
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code text DEFAULT '',
  client_name text NOT NULL,
  contact_person text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address_line_1 text DEFAULT '',
  address_line_2 text DEFAULT '',
  address_line_3 text DEFAULT '',
  postal_code text DEFAULT '',
  notes text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clients"
  ON public.clients FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Stock writer can insert clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (public.can_write_stock());

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  client_name text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'OrderCo'
    CHECK (source IN ('OrderCo', 'Email', 'Phone', 'Other')),
  customer_reference text DEFAULT '',
  status text NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'Dispatched', 'Awaiting Confirmation', 'Completed', 'Cancelled')),
  notes text DEFAULT '',
  printed_at timestamptz,
  dispatched_at timestamptz,
  signed_note_path text,
  signed_note_name text DEFAULT '',
  signed_note_size_bytes bigint,
  signed_note_uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_note_uploaded_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  confirmation_note text DEFAULT '',
  movement_group_id uuid,
  cancelled_reason text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_orders_status ON public.stock_orders (status);
CREATE INDEX IF NOT EXISTS idx_stock_orders_date   ON public.stock_orders (order_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_orders_client ON public.stock_orders (client_id);

ALTER TABLE public.stock_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock_orders"
  ON public.stock_orders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Stock writer can insert stock_orders"
  ON public.stock_orders FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_orders"
  ON public.stock_orders FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_orders"
  ON public.stock_orders FOR DELETE TO authenticated
  USING (public.can_write_stock());

CREATE TRIGGER stock_orders_updated_at
  BEFORE UPDATE ON public.stock_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_order_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.stock_orders(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  stock_code text DEFAULT '',
  stock_item text NOT NULL,
  description text DEFAULT '',
  unit_of_measure text DEFAULT '',
  qty_ordered numeric NOT NULL CHECK (qty_ordered > 0),
  qty_delivered numeric,
  variance_note text DEFAULT '',
  line_no integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_order_items_order ON public.stock_order_items (order_id);

ALTER TABLE public.stock_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock_order_items"
  ON public.stock_order_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Stock writer can insert stock_order_items"
  ON public.stock_order_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_order_items"
  ON public.stock_order_items FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_order_items"
  ON public.stock_order_items FOR DELETE TO authenticated
  USING (public.can_write_stock());

-- ─────────────────────────────────────────────────────────────────────────────
-- delivery-notes storage bucket (signed PODs)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-notes',
  'delivery-notes',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read delivery notes"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-notes');

CREATE POLICY "Stock writer can upload delivery notes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-notes' AND public.can_write_stock());

CREATE POLICY "Stock writer can update delivery note objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'delivery-notes' AND public.can_write_stock());

CREATE POLICY "Stock writer can delete delivery note objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'delivery-notes' AND public.can_write_stock());
