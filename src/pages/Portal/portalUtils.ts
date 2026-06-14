import { useEffect, useState } from 'react';
import { supabase, type ReceivedWasteCustomerRow, type EsgResultCustomerRow } from '../../lib/supabase';
import { usePortalClient } from './PortalClientContext';

// ── customer-safe row mappers (admin-preview path queries base tables) ──────────
function mapWasteRow(r: Record<string, unknown>): ReceivedWasteCustomerRow {
  const site = r.client_sites as { generator_group: string | null; generator_facility: string | null } | null;
  return {
    id: r.id as string,
    client_id: r.client_id as string,
    client_name: (r.clients as { client_name: string } | null)?.client_name ?? '',
    site_id: (r.site_id as string | null) ?? null,
    generator_group: site?.generator_group ?? null,
    generator_facility: site?.generator_facility ?? null,
    waste_manifest_tracking_number: (r.waste_manifest_tracking_number as string) ?? '',
    received_date: (r.received_date as string | null) ?? null,
    collection_date: (r.collection_date as string | null) ?? null,
    facility_receipt_date: (r.facility_receipt_date as string | null) ?? null,
    received_date_source: r.received_date_source as ReceivedWasteCustomerRow['received_date_source'],
    waste_category_id: (r.waste_category_id as string | null) ?? null,
    waste_category_name: (r.waste_categories as { waste_category_name: string } | null)?.waste_category_name ?? null,
    hcrw_super_category: (r.hcrw_super_category as string) ?? '',
    container_type_id: (r.container_type_id as string | null) ?? null,
    container_type_name: (r.container_types as { container_type_name: string } | null)?.container_type_name ?? null,
    containers_received: Number(r.containers_received) || 0,
    nett_weight_kg: Number(r.nett_weight_kg) || 0,
    reusable_boolean: Boolean(r.reusable_boolean),
  };
}

/** Loads received-waste rows. Real customers get the RLS view; admin preview reads the selected client's base rows. */
export function usePortalWaste() {
  const { clientId, siteId, adminPreview } = usePortalClient();
  const [rows, setRows] = useState<ReceivedWasteCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (adminPreview && !clientId) {
          if (!cancelled) setRows([]);
          return;
        }

        if (adminPreview) {
          let q = supabase
            .from('received_waste_records')
            .select('id, client_id, site_id, waste_manifest_tracking_number, received_date, collection_date, facility_receipt_date, received_date_source, waste_category_id, hcrw_super_category, container_type_id, containers_received, nett_weight_kg, reusable_boolean, clients(client_name), client_sites(generator_group, generator_facility), waste_categories(waste_category_name), container_types(container_type_name)')
            .eq('client_id', clientId!)
            .eq('import_status', 'imported');
          if (siteId) q = q.eq('site_id', siteId);
          const { data, error: err } = await q.order('received_date', { ascending: false });
          if (cancelled) return;
          if (err) setError(err.message);
          setRows(((data ?? []) as Array<Record<string, unknown>>).map(mapWasteRow));
        } else {
          const { data, error: err } = await supabase
            .from('v_received_waste')
            .select('*')
            .order('received_date', { ascending: false });
          if (cancelled) return;
          if (err) setError(err.message);
          setRows((data ?? []) as ReceivedWasteCustomerRow[]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteId, adminPreview]);

  return { rows, loading, error };
}

/** Loads approved ESG results. Real customers get the RLS view; admin preview reads the selected client's approved rows. */
export function usePortalEsg() {
  const { clientId, siteScoped, adminPreview } = usePortalClient();
  const [rows, setRows] = useState<EsgResultCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
      // ESG is account-level only; a site-scoped login/preview sees none.
      if (siteScoped) {
        if (!cancelled) setRows([]);
        return;
      }

      if (adminPreview && !clientId) {
        if (!cancelled) setRows([]);
        return;
      }

      if (adminPreview) {
        const [esgRes, ccRes] = await Promise.all([
          supabase
            .from('esg_results')
            .select('id, client_id, period_month, co2e_saved_kg, residual_tco2e, water_saved_kl, electricity_saved_kwh, diesel_saved_l, km_avoided, trips_avoided, indicative_carbon_credits, total_nett_kg, treatment_emissions_by_method, transport_comparison, data_basis, clients(client_name)')
            .eq('client_id', clientId!)
            .eq('approved', true)
            .order('period_month', { ascending: false }),
          supabase.from('carbon_credit_evidence').select('period_month, verified').eq('client_id', clientId!),
        ]);
        if (cancelled) return;

        // Mirror v_esg_results.credits_verified: any verified evidence for that month, or month-less.
        const evidence = (ccRes.data ?? []) as Array<{ period_month: string | null; verified: boolean }>;
        const anyMonthless = evidence.some(e => e.verified && e.period_month === null);
        const verifiedMonths = new Set(evidence.filter(e => e.verified && e.period_month).map(e => e.period_month as string));

        setRows(((esgRes.data ?? []) as Array<Record<string, unknown>>).map(r => ({
          id: r.id as string,
          client_id: r.client_id as string,
          client_name: (r.clients as { client_name: string } | null)?.client_name ?? '',
          period_month: r.period_month as string,
          co2e_saved_kg: r.co2e_saved_kg as number | null,
          residual_tco2e: r.residual_tco2e as number | null,
          water_saved_kl: r.water_saved_kl as number | null,
          electricity_saved_kwh: r.electricity_saved_kwh as number | null,
          diesel_saved_l: r.diesel_saved_l as number | null,
          km_avoided: r.km_avoided as number | null,
          trips_avoided: r.trips_avoided as number | null,
          indicative_carbon_credits: r.indicative_carbon_credits as number | null,
          total_nett_kg: Number(r.total_nett_kg) || 0,
          treatment_emissions_by_method: (r.treatment_emissions_by_method as Record<string, number>) ?? {},
          transport_comparison: (r.transport_comparison as Record<string, number>) ?? {},
          data_basis: (r.data_basis as EsgResultCustomerRow['data_basis']) ?? {},
          credits_verified: anyMonthless || verifiedMonths.has(r.period_month as string),
        })));
      } else {
        const { data } = await supabase.from('v_esg_results').select('*').order('period_month', { ascending: false });
        if (cancelled) return;
        setRows((data ?? []) as EsgResultCustomerRow[]);
      }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteScoped, adminPreview]);

  return { rows, loading };
}

export const kg = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
export const num = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });

export function monthKey(dateIso: string | null): string {
  return dateIso ? dateIso.substring(0, 7) : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabel(ym: string): string {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function fmtDate(dateIso: string | null): string {
  return dateIso ? new Date(dateIso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const PALETTE = ['#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#6b7280'];
export function colorFor(key: string, index: number): string {
  void key;
  return PALETTE[index % PALETTE.length];
}

export function sumBy<T>(rows: T[], group: (r: T) => string, value: (r: T) => number): [string, number][] {
  const map: Record<string, number> = {};
  rows.forEach(r => { const k = group(r) || '—'; map[k] = (map[k] || 0) + value(r); });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
