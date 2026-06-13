/*
  # Commercial — CRM foundation (Phase 1)

  Turns the read-mostly Commercial section into a "Salesforce-feel" CRM around the
  existing customers (public.clients = Accounts). Adds:

    - crm_contacts     — many people per account (the existing clients.contact_person
                         single field is kept; this is the proper multi-contact model).
    - crm_activities   — tasks / calls / notes / emails / meetings; drives both the
                         per-record activity timeline and task lists.
    - crm_saved_views  — saved list-view filter/column configs (per user, optionally
                         shared) that power the Phase-2 ListView component.
    - clients          — extended with CRM account fields (owner, industry, status,
                         website).

  Security (matches the commercial idiom in 20260613140000 / 20260613150000):
    - Staff (NOT is_customer()) read; writes gated by can_write_commercial().
    - Commercial routes are already admin-only at the app layer (StockControllerGuard).
    - CRM internals are staff-only — never exposed to customer/portal users.
    - crm_saved_views rows are private to their owner unless is_shared.

  No sales pipeline / opportunities (explicitly out of scope).
*/

-- ── 1. Extend clients with CRM account fields ───────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS account_owner uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('prospect','active','inactive')),
  ADD COLUMN IF NOT EXISTS website text DEFAULT '';

-- ── 2. crm_contacts: people at an account ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  job_title text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  mobile text DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  -- optional link to the portal login this person uses
  portal_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_client ON public.crm_contacts (client_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_portal_user ON public.crm_contacts (portal_user_id);

-- ── 3. crm_activities: timeline + tasks ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'note'
    CHECK (type IN ('task','call','note','email','meeting')),
  subject text NOT NULL DEFAULT '',
  body text DEFAULT '',
  -- 'open' tasks show in task lists; non-task types are logged as 'completed'
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('open','completed')),
  due_date date,
  completed_at timestamptz,
  owner_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_client ON public.crm_activities (client_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON public.crm_activities (contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_owner_open
  ON public.crm_activities (owner_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_crm_activities_due ON public.crm_activities (due_date);

-- ── 4. crm_saved_views: list-view filter/column configs ─────────────────────
CREATE TABLE IF NOT EXISTS public.crm_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  object_key text NOT NULL,               -- e.g. 'accounts' | 'contacts' | 'sites' | 'activities'
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_saved_views_owner ON public.crm_saved_views (owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_saved_views_object ON public.crm_saved_views (object_key);

-- ── 5. updated_at triggers ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS crm_contacts_updated_at ON public.crm_contacts;
CREATE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS crm_activities_updated_at ON public.crm_activities;
CREATE TRIGGER crm_activities_updated_at BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS crm_saved_views_updated_at ON public.crm_saved_views;
CREATE TRIGGER crm_saved_views_updated_at BEFORE UPDATE ON public.crm_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 6. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.crm_contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_saved_views  ENABLE ROW LEVEL SECURITY;

-- crm_contacts: staff read; writes commercial. Customers never read CRM internals.
CREATE POLICY "Staff read crm_contacts" ON public.crm_contacts FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write crm_contacts ins" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write crm_contacts upd" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write crm_contacts del" ON public.crm_contacts FOR DELETE TO authenticated USING (public.can_write_commercial());

-- crm_activities: staff read; writes commercial.
CREATE POLICY "Staff read crm_activities" ON public.crm_activities FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write crm_activities ins" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write crm_activities upd" ON public.crm_activities FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write crm_activities del" ON public.crm_activities FOR DELETE TO authenticated USING (public.can_write_commercial());

-- crm_saved_views: private to owner unless shared; writes by owner only (and commercial writers).
CREATE POLICY "Read crm_saved_views" ON public.crm_saved_views FOR SELECT TO authenticated
  USING (NOT public.is_customer() AND (owner_id = auth.uid() OR is_shared));
CREATE POLICY "Write crm_saved_views ins" ON public.crm_saved_views FOR INSERT TO authenticated
  WITH CHECK (public.can_write_commercial() AND owner_id = auth.uid());
CREATE POLICY "Write crm_saved_views upd" ON public.crm_saved_views FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Write crm_saved_views del" ON public.crm_saved_views FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
