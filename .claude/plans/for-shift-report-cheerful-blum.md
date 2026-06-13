# Implementation Plan — Shift Reports, Documents, Incidents, Employee Medical

## Context

Four operational gaps need to be closed in the T4G Management App (React + TypeScript + Vite + Supabase):

1. **Shift Reports** — Night shifts span ~23:00 → ~08:00 the next morning and the report is filled in the morning. They must be attributed to the **day the shift started** (the previous calendar day). The current `getShiftDate()` logic is actually broken for this case (a report filled at 08:00 gets *today's* date).
2. **Documents** — Need a **secure, admin-only category** to hold company/compliance docs (BEE certificates, registration, tax clearance, etc.), enforced at the database level — and an **admin-only global expiry dashboard** consolidating all expiring compliance items.
3. **Incidents** — Admins/management must be able to **fully edit and close** incidents (today the view modal is read-only), **create a corrective action linked to a selected incident** from the Corrective Actions section, and **close (complete) a corrective action**.
4. **Employee Register** — Need structured, dated **medical records (vaccinations, medical exams)** with **file uploads**, treated as sensitive data (visible to **admin + management only**).

### Decisions locked with the user
- Shift date: **auto only** (fix the logic; no manual override field).
- Secure docs: **admin-only category** via RLS (not a per-doc flag).
- Incidents: **full edit + close**.
- Medical records access: **admin + management**.

### Key conventions to reuse (verified in code)
- Role gating frontend: `useUser()` → `isAdmin`, `isManagement`, `canWrite(module)` in [src/lib/UserContext.tsx](src/lib/UserContext.tsx).
- Role gating backend: SECURITY DEFINER SQL helpers `public.is_admin()`, `public.can_write()`, `public.can_write_stock()` (see `supabase/migrations/20260607000006_fix_security_definer_functions.sql`). RLS pattern: SELECT `USING (true)`, writes `WITH CHECK (public.can_write())`.
- File upload pattern: [src/pages/DocumentLibrary/DocumentFormModal.tsx](src/pages/DocumentLibrary/DocumentFormModal.tsx) — upload to a private Storage bucket, path `{folder}/{year}/{crypto.randomUUID()}.{ext}`, download via `supabase.storage.from(bucket).createSignedUrl(path, 3600)`.
- Reusable UI: [src/components/Modal.tsx](src/components/Modal.tsx), `EmployeeSelect`, `EmployeeMultiSelect`, native `<input type="date">`, `expiryStatus()` helper in [src/pages/DocumentLibrary/index.tsx](src/pages/DocumentLibrary/index.tsx#L52).
- Migration naming: `YYYYMMDDHHMMSS_snake_case.sql`. Latest existing is `20260611100100...`; new files use `20260613xxxxxx_...`. Per [[t4g-supabase-setup]], apply via the migration-push workflow; `.env` keeps the anon key only. Note there are **pre-existing** typecheck errors unrelated to this work.

---

## Feature 1 — Night-shift date attribution

**File:** [src/pages/OperatorShiftEntry/index.tsx](src/pages/OperatorShiftEntry/index.tsx#L44) — `getShiftDate()` (lines 44–55).

Replace the night branch so a Night shift is attributed to the day it **started**:
- Reported in the morning/afternoon (`hour < 18`) → it started **yesterday** → return previous day.
- Reported in the evening (`hour >= 18`, i.e. at/after the ~23:00 start) → it started **today** → return today.
- Day/Afternoon shifts unchanged (today).

```ts
function getShiftDate(shift: ShiftType): string {
  const now = new Date();
  if (shift === 'Night' && now.getHours() < 18) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return toLocalISO(prev);   // see note below
  }
  return toLocalISO(now);
}
```

- **Timezone note:** the existing code uses `now.toISOString().split('T')[0]`, which converts to UTC. For SAST (UTC+2) this is safe in practice, but to be robust add a small local-date helper (`toLocalISO`) that formats from local Y/M/D rather than UTC, and use it both here and where `now` is formatted. Keep it inline in this file (no new shared util needed).
- No DB change. `shift_date` flows unchanged into `treatment_shift_reports.shift_date` (line ~196) and into the `treatment_daily_log` upsert key (line ~271), so night data automatically aggregates onto the previous day's row.
- The selected date is already shown to the operator via `formatDisplayDate` on the form/summary steps — no UI change needed, but verify it displays the corrected (previous) day.

---

## Feature 2 — Admin-only document category + global expiry dashboard

### 2a. Admin-only "Company" category (DB-enforced)

**Migration:** `supabase/migrations/20260613000001_documents_company_category_and_admin_rls.sql`
- **Update the CHECK constraint.** ⚠️ The original constraint in `20260607000001_phase1_documents...sql` (`'SOP','License','Permit','Policy','Certificate','Other'`) does **not** match the current TS categories — a later migration changed it. The new migration must `ALTER TABLE public.documents DROP CONSTRAINT <current_name>` then re-add a CHECK including the full current set **plus `'Company'`**. Inspect the live constraint name first (`\d public.documents` or query `pg_constraint`).
- **Restrict SELECT** so non-admins cannot even read admin-only rows. Drop the existing `FOR SELECT ... USING (true)` policy and recreate:
  ```sql
  CREATE POLICY "Read documents (admin-only categories gated)"
    ON public.documents FOR SELECT TO authenticated
    USING (category <> 'Company' OR public.is_admin());
  ```
  Write policies stay as `public.can_write()`. (File paths are UUID-based and rows are now RLS-protected; tightening the Storage bucket's read policy is optional follow-up, not required.)

**Frontend:**
- [src/lib/supabase.ts](src/lib/supabase.ts#L570): add `'Company'` to `DocumentCategory`.
- [src/pages/DocumentLibrary/DocumentFormModal.tsx](src/pages/DocumentLibrary/DocumentFormModal.tsx#L6): append `'Company'` to the `CATEGORIES` array **only when the user is admin** (read `isAdmin` from `useUser()`; non-admins never see the option).
- [src/pages/DocumentLibrary/index.tsx](src/pages/DocumentLibrary/index.tsx): add `'Company'` to `SLUG_TO_CATEGORY` (slug `company`), `CATEGORY_LABELS`, and `CAT_BADGE`. Guard the Company category route/view with `isAdmin` (redirect or empty state if a non-admin hits it directly — RLS already returns no rows, but hide the UI too).
- **Sidebar/routing:** add a "Company / Compliance" entry under Documents in [src/components/Sidebar.tsx](src/components/Sidebar.tsx) gated by `isAdmin`, and ensure the `:category` route in [src/App.tsx](src/App.tsx) accepts the `company` slug (it already routes by slug param).

### 2b. Admin-only global expiry dashboard

**New page:** `src/pages/ComplianceExpiry/index.tsx` (admin-only).
- Route in [src/App.tsx](src/App.tsx) gated by `isAdmin` (mirror existing admin-gated routing); add a Sidebar link gated by `isAdmin`.
- On load, query in parallel and merge into one list of `{ source, name, owner, date, kind: 'expiry'|'review', status }`:
  - `documents` — `expiry_date` and `review_date`
  - `legal_appointments` — `expiry_date` (+ employee name)
  - `training_certificates` — `expiry_date` (+ employee name)
  - `employee_medical_records` — `expiry_date` (Feature 4; admin can read)
- Reuse the `expiryStatus()` logic (extract the helper from `DocumentLibrary/index.tsx` into `src/lib/formatters.ts` or copy it) to colour rows expired (red) / soon ≤30d (amber). Sort by date ascending; default filter to expired + soon. Provide CSV export via existing `downloadCSV` ([src/lib/csvExport.ts](src/lib/csvExport.ts)).

---

## Feature 3 — Incident close/edit + corrective-action linkage

### 3a. Full edit + close for incidents

**[src/pages/SafetyIncidents/index.tsx](src/pages/SafetyIncidents/index.tsx):**
- Add `const { canWrite } = useUser();` and gate edit/close UI on `canWrite('safety')`.
- Add `editingId: string | null` state. Add `openEditModal(incident)` that prefills `formData` from the incident and opens the form modal.
- Update `handleSave` to branch: if `editingId` → `supabase.from('safety_incidents').update({ ...formData, updated_at }).eq('id', editingId)`; else the existing insert-with-generated-number path.

**[src/pages/SafetyIncidents/IncidentFormModal.tsx](src/pages/SafetyIncidents/IncidentFormModal.tsx):**
- Add an `isEdit?: boolean` prop; make the title dynamic (`'Edit Incident'` vs `'Report Safety Incident'`). The form already includes Status + Closed Date fields (lines 174–193), so closing via edit already works.

**[src/pages/SafetyIncidents/IncidentViewModal.tsx](src/pages/SafetyIncidents/IncidentViewModal.tsx):**
- Accept `canWrite`, `onEdit`, and `onClose Incident` props. Add an **Edit** button (calls `onEdit`) and a one-click **Close Incident** button (visible when status ≠ 'Closed') that sets `status='Closed'`, `closed_date=today` and saves, then refreshes. Display `closed_date` in the detail grid.

### 3b. Generate a corrective action from a selected incident

**Migration:** `supabase/migrations/20260613000002_corrective_action_incident_link.sql`
- `ALTER TABLE public.safety_corrective_actions ADD COLUMN source_incident_id uuid REFERENCES public.safety_incidents(id) ON DELETE SET NULL;` + index. (Keep existing free-text `source_reference` for display/back-compat.)

**[src/lib/supabase.ts](src/lib/supabase.ts#L267):** add `source_incident_id: string | null` to `SafetyCorrectiveAction`.

**[src/pages/SafetyCorrectiveActions/ActionFormModal.tsx](src/pages/SafetyCorrectiveActions/ActionFormModal.tsx):**
- When `source_type === 'Incident'`, render a **select of incidents** (load `safety_incidents` ordered by date desc; option label = `incident_number — description`). On pick, set `source_incident_id` and `source_reference = incident_number`. Persist `source_incident_id` in the insert payload.
- (Optional shortcut) Add a "Create Corrective Action" button on `IncidentViewModal` that opens this form pre-seeded with that incident.

### 3c. Edit / close a corrective action

- Extend `ActionFormModal` to accept an optional existing `action` → **edit mode** (update instead of insert; prefill state from the action). The status select already offers `Completed`/`Verified` with `completed_date` + `evidence` (lines 72–80), so "closing" = setting status to Completed/Verified.
- In `src/pages/SafetyCorrectiveActions/index.tsx` + `ActionViewModal.tsx`: add **Edit** and a one-click **Mark Complete** action, gated on `canWrite('safety')` (add `useUser`). Wire `onSave` to refresh the list. (Read these two files when implementing to match their existing modal wiring — same pattern as the incidents section.)

---

## Feature 4 — Employee medical records (vaccinations) + file upload

### 4a. Database

**Migration:** `supabase/migrations/20260613000003_employee_medical_records.sql`
- New helper function (admin **or** management):
  ```sql
  CREATE OR REPLACE FUNCTION public.can_access_medical()
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
  AS $$ SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin','management') AND is_active = true
  ); $$;
  ```
- New table `public.employee_medical_records`:
  - `id uuid pk default gen_random_uuid()`
  - `employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE`
  - `record_type text NOT NULL DEFAULT 'Vaccination' CHECK (record_type IN ('Vaccination','Medical Exam','Fitness Certificate','Other'))`
  - `name text NOT NULL DEFAULT ''` (e.g. "Hepatitis B", "Annual Medical")
  - `date_administered date` · `expiry_date date` (next due / expiry)
  - `provider text DEFAULT ''` · `notes text DEFAULT ''`
  - `file_path text DEFAULT ''` · `file_name text DEFAULT ''` · `file_size_bytes bigint DEFAULT 0`
  - `created_by uuid REFERENCES auth.users(id)` · `created_at`/`updated_at timestamptz DEFAULT now()`
  - Indexes on `employee_id` and `expiry_date`; `updated_at` trigger via existing `public.update_updated_at()`.
- RLS: enable, then **all four** policies (SELECT/INSERT/UPDATE/DELETE) use `public.can_access_medical()` in `USING` / `WITH CHECK` (this is sensitive data — even SELECT is restricted, unlike other tables).

**Migration:** `supabase/migrations/20260613000004_create_employee_medical_storage_bucket.sql`
- Create private bucket `employee-medical` (public=false; allowed MIME types as in the documents bucket; size limit e.g. 50 MB). `storage.objects` policies for this bucket restricted to `public.can_access_medical()` for SELECT/INSERT/UPDATE/DELETE (model on `20260607000002_create_documents_storage_bucket.sql`).

### 4b. Frontend

- [src/lib/supabase.ts](src/lib/supabase.ts): add `EmployeeMedicalRecord` type.
- **New** `src/pages/EmployeeRegister/MedicalRecordModal.tsx` — form modal (follow `DocumentFormModal` + `LegalAppointmentModal` patterns): fields `record_type` (select), `name`, `date_administered` (date), `expiry_date` (date), `provider`, `notes`, and **file upload** to the `employee-medical` bucket (path `${employee_id}/${crypto.randomUUID()}.${ext}`). Supports create + edit; sets `created_by` from session on create.
- [src/pages/EmployeeRegister/EmployeeProfile.tsx](src/pages/EmployeeRegister/EmployeeProfile.tsx):
  - Add `isManagement` from `useUser()`; `const canViewMedical = isAdmin || isManagement`.
  - Add a new **"Medical" tab** (icon e.g. `Activity`/`Shield`) rendered **only when `canViewMedical`**. Load records via `supabase.from('employee_medical_records').select('*').eq('employee_id', id).order('date_administered', {ascending:false})`.
  - Render the list reusing the legal-appointments expiry styling (lines ~621–660): show name/type, administered date, expiry with expired/soon colouring, a **Download** button (signed URL from `employee-medical`), and Add/Edit/Delete gated on `canViewMedical` (reuse `DeleteConfirmModal`).
  - Medical records also feed the Feature 2b expiry dashboard.
- (Optional) Surface a count badge on the medical tab like the other tabs.

---

## Suggested implementation order
1. Feature 1 (isolated, low risk).
2. Feature 4 DB + `can_access_medical()` (other features/dashboard depend on it).
3. Feature 2 (category + RLS, then dashboard).
4. Feature 3 (incidents edit/close, CA linkage, CA close).
5. Wire Feature 4 frontend + add medical to the expiry dashboard.

## Verification
- **Build/typecheck:** `npm run build` (or `tsc --noEmit`). Expect only the **pre-existing** errors noted in [[t4g-supabase-setup]]; no new ones.
- **Apply migrations** to Supabase via the established push workflow, then verify in the SQL editor that the new constraint, columns, function, table, and bucket exist.
- **Manual run** (`npm run dev`):
  - *Shift:* create a Night shift report in the morning → confirm the displayed/saved `shift_date` is the **previous** day and that `treatment_daily_log` aggregates night totals onto that day.
  - *Documents:* as **admin**, upload a doc in **Company** category; as a **non-admin** user, confirm the Company category/route shows nothing and the API returns no rows (RLS). Confirm the expiry dashboard is reachable only by admin and lists items from documents, appointments, certificates, and medical.
  - *Incidents:* edit an incident, use one-click **Close** (status=Closed + closed_date). From Corrective Actions, create an action with source **Incident**, pick a specific incident, save, and confirm `source_incident_id` is set; then edit it to **Completed** and confirm it closes.
  - *Medical:* as admin/management, add a vaccination with a file and expiry; download via signed URL; confirm a **non**-admin/management user cannot see the Medical tab or read the rows/files (RLS).
