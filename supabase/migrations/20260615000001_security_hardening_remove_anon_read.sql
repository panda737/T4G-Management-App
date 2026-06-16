-- ─────────────────────────────────────────────────────────────────────────────
-- Critical Security Hardening — remove unauthenticated/PUBLIC read from internal
-- training/toolbox and legacy stock tables (pre-main).
--
-- Background: these tables date from the "internal tool, no login" era and still
-- expose SELECT to the `anon` role (and, defensively, possibly PUBLIC). The app now
-- uses Supabase Auth, so anonymous read is both unnecessary and a data-exposure risk
-- (employee names + captured signatures in training_attendance; supplier/customer
-- references in stock_movements; quiz answer keys in training_module_questions).
--
-- Target access model for ALL ten tables below:
--   • anon  / PUBLIC          → NO access (policies removed + privileges revoked)
--   • authenticated INTERNAL  → read (admin, management, stock_controller, production,
--                               operator, viewer) — i.e. NOT public.is_customer()
--   • admin                   → full read (is a non-customer)
--   • customer                → NO read (excluded by the NOT public.is_customer() guard)
--
-- This migration is READ-ONLY hardening: it changes SELECT policies/grants only.
-- Write policies (already scoped to public.can_write_stock() / authenticated) are
-- left untouched. No business data is read or modified.
-- ─────────────────────────────────────────────────────────────────────────────

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. TRAINING & TOOLBOX — drop anon read; re-scope internal read off customers ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- 1a. Remove the lingering anon SELECT policies.
DROP POLICY IF EXISTS "Anon can read training modules" ON public.training_modules;
DROP POLICY IF EXISTS "Anon can read module questions" ON public.training_module_questions;
DROP POLICY IF EXISTS "Anon can read assessments"      ON public.training_assessments;
DROP POLICY IF EXISTS "Anon can read attendance"       ON public.training_attendance;
DROP POLICY IF EXISTS "Anon can read toolbox topics"   ON public.toolbox_talk_topics;

-- 1b. Replace each authenticated read policy (was: auth.uid() IS NOT NULL, which also
--     let customer logins read) with an internal-only predicate.
DROP POLICY IF EXISTS "Authenticated users can read training modules" ON public.training_modules;
CREATE POLICY "Authenticated users can read training modules"
  ON public.training_modules FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Authenticated users can read module questions" ON public.training_module_questions;
CREATE POLICY "Authenticated users can read module questions"
  ON public.training_module_questions FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Authenticated users can read assessments" ON public.training_assessments;
CREATE POLICY "Authenticated users can read assessments"
  ON public.training_assessments FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Authenticated users can read attendance" ON public.training_attendance;
CREATE POLICY "Authenticated users can read attendance"
  ON public.training_attendance FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Authenticated users can read toolbox topics" ON public.toolbox_talk_topics;
CREATE POLICY "Authenticated users can read toolbox topics"
  ON public.toolbox_talk_topics FOR SELECT TO authenticated
  USING (NOT public.is_customer());

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. LEGACY STOCK TABLES — replace anon+authenticated SELECT with internal-only ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- Each of these tables' ONLY SELECT policy currently targets `anon, authenticated`,
-- so it must be dropped AND replaced (otherwise internal users would lose read).

DROP POLICY IF EXISTS "Allow all access to stock_categories" ON public.stock_categories;        -- repo name
DROP POLICY IF EXISTS "Authenticated users can read stock_categories" ON public.stock_categories; -- actual prod name (drift)
CREATE POLICY "Read stock_categories (internal)"
  ON public.stock_categories FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Allow select on stock_items" ON public.stock_items;            -- repo name
DROP POLICY IF EXISTS "Authenticated users can read stock_items" ON public.stock_items; -- actual prod name (drift)
CREATE POLICY "Read stock_items (internal)"
  ON public.stock_items FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Allow select on stock_movements" ON public.stock_movements;            -- repo name
DROP POLICY IF EXISTS "Authenticated users can read stock_movements" ON public.stock_movements; -- actual prod name (drift)
CREATE POLICY "Read stock_movements (internal)"
  ON public.stock_movements FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Allow select on stock_take_sessions" ON public.stock_take_sessions;            -- repo name
DROP POLICY IF EXISTS "Authenticated users can read stock_take_sessions" ON public.stock_take_sessions; -- actual prod name (drift)
CREATE POLICY "Read stock_take_sessions (internal)"
  ON public.stock_take_sessions FOR SELECT TO authenticated
  USING (NOT public.is_customer());

DROP POLICY IF EXISTS "Allow select on stock_take_line_items" ON public.stock_take_line_items;            -- repo name
DROP POLICY IF EXISTS "Authenticated users can read stock_take_line_items" ON public.stock_take_line_items; -- actual prod name (drift)
CREATE POLICY "Read stock_take_line_items (internal)"
  ON public.stock_take_line_items FOR SELECT TO authenticated
  USING (NOT public.is_customer());

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. Privilege hardening — revoke from anon AND PUBLIC; grant to authenticated ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- Dropping the anon policy is the effective control (RLS is deny-by-default), but we
-- also strip the underlying table GRANTs from anon and PUBLIC as defence-in-depth,
-- then ensure `authenticated` retains the table-level SELECT its new policy relies on.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'training_modules','training_module_questions','training_assessments',
    'training_attendance','toolbox_talk_topics',
    'stock_categories','stock_items','stock_movements',
    'stock_take_sessions','stock_take_line_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM PUBLIC', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. SELF-TEST — fail the migration unless the hardening is fully in place    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'training_modules','training_module_questions','training_assessments',
    'training_attendance','toolbox_talk_topics',
    'stock_categories','stock_items','stock_movements',
    'stock_take_sessions','stock_take_line_items'
  ];
  has_anon boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_auth boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- (a) no policy on the table may reference the anon role
    IF EXISTS (SELECT 1 FROM pg_policies
               WHERE schemaname = 'public' AND tablename = t AND 'anon' = ANY(roles)) THEN
      RAISE EXCEPTION 'Hardening failed: anon policy still present on %', t;
    END IF;

    -- (b) no policy on the table may reference the public role
    IF EXISTS (SELECT 1 FROM pg_policies
               WHERE schemaname = 'public' AND tablename = t AND 'public' = ANY(roles)) THEN
      RAISE EXCEPTION 'Hardening failed: public-role policy still present on %', t;
    END IF;

    -- (c) anon must NOT hold the SELECT table privilege (also catches a PUBLIC grant)
    IF has_anon AND has_table_privilege('anon', format('public.%I', t), 'SELECT') THEN
      RAISE EXCEPTION 'Hardening failed: anon still has SELECT privilege on %', t;
    END IF;

    -- (d) PUBLIC must NOT hold the SELECT table privilege (grantee OID 0 in aclexplode)
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
        AND EXISTS (SELECT 1 FROM aclexplode(c.relacl) a
                    WHERE a.grantee = 0 AND a.privilege_type = 'SELECT')
    ) THEN
      RAISE EXCEPTION 'Hardening failed: PUBLIC still has SELECT privilege on %', t;
    END IF;

    -- (e) authenticated/internal users must retain the SELECT table privilege
    IF has_auth AND NOT has_table_privilege('authenticated', format('public.%I', t), 'SELECT') THEN
      RAISE EXCEPTION 'Hardening failed: authenticated lost SELECT privilege on %', t;
    END IF;

    -- (f) there must be at least one SELECT policy, and every SELECT policy must
    --     exclude customers (carry the is_customer guard) so customer logins cannot read
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname = 'public' AND tablename = t AND cmd IN ('SELECT','ALL')) THEN
      RAISE EXCEPTION 'Hardening failed: no SELECT policy left on % (internal users would lose read)', t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies
               WHERE schemaname = 'public' AND tablename = t AND cmd IN ('SELECT','ALL')
                 AND coalesce(qual, '') NOT ILIKE '%is_customer%') THEN
      RAISE EXCEPTION 'Hardening failed: a SELECT policy on % does not exclude customers', t;
    END IF;
  END LOOP;

  RAISE NOTICE 'Security hardening self-test passed for all % protected tables.', array_length(tables, 1);
END $$;
