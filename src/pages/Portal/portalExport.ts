// ─────────────────────────────────────────────────────────────────────────────
// Portal CSV export shapers.
//
// PURE: these functions take rows already produced by the scoped portal_* RPCs
// (via the portalApi hooks / fetchAll helpers) and shape them into labelled,
// reconciliation-friendly CSV rows. They never touch the database, so the export
// path cannot bypass the verified RPC/RLS scope. Numeric values are emitted raw
// (no rounding/formatting) so a column sum reconciles exactly to the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
import { downloadCsvSafe } from '../../lib/csvExport';
import type {
  SiteRow, CategoryRow, ContainerRow, SiteBreakdownRow, ManifestHistRow, WasteDetailRow,
} from './portalApi';

const stamp = () => new Date().toISOString().slice(0, 10);
const file = (base: string, scope: string) => `t4g-${base}-${scope}-${stamp()}`;

/** Dashboard "Export Data" — site contribution for the selected period (sum kg == dashboard total). */
export function exportDashboardSites(rows: SiteRow[], scope: string): boolean {
  return downloadCsvSafe(rows.map(s => ({
    'Site / Facility': s.generator_facility,
    'Province': s.province || '',
    'Nett kg': s.kg,
    'Containers': s.containers,
    'Records': s.rows,
  })), file('dashboard-sites', scope));
}

/** Site Breakdown page. */
export function exportSiteBreakdown(rows: SiteBreakdownRow[], scope: string): boolean {
  return downloadCsvSafe(rows.map(s => ({
    'Generator Facility': s.generator_facility,
    'Province': s.province || '',
    'Nett kg': s.kg,
    'Containers': s.containers,
    'Top Category': s.top_category,
    'Manifests': s.manifests,
    'Last Received': s.last_received || '',
  })), file('site-breakdown', scope));
}

/** Waste Categories page. */
export function exportCategories(rows: CategoryRow[], scope: string): boolean {
  return downloadCsvSafe(rows.map(c => ({
    'Waste Category': c.category,
    'HCRW Super Category': c.hcrw_super || '',
    'Nett kg': c.kg,
    'Containers': c.containers,
    'Records': c.rows,
  })), file('waste-categories', scope));
}

/** Received Waste page — by container type. */
export function exportContainers(rows: ContainerRow[], scope: string): boolean {
  return downloadCsvSafe(rows.map(c => ({
    'Container Type': c.container_type,
    'Containers': c.containers,
    'Nett kg': c.kg,
    'Records': c.rows,
  })), file('received-containers', scope));
}

/** Manifest History page (rows from fetchAllManifests). */
export function exportManifests(rows: ManifestHistRow[], scope: string): boolean {
  return downloadCsvSafe(rows.map(m => ({
    'Tracking #': m.tracking,
    'Received Date': m.received_date || '',
    'Collection Date': m.collection_date || '',
    'Facility': m.generator_facility,
    'Categories': m.categories,
    'Containers': m.containers,
    'Nett kg': m.kg,
    'Lines': m.lines,
  })), file('manifests', scope));
}

/** Monthly Report page (rows from fetchAllReportRows). */
export function exportReportRows(rows: WasteDetailRow[], scope: string): boolean {
  return downloadCsvSafe(rows.map(r => ({
    'Received Date': r.received_date || '',
    'Collection Date': r.collection_date || '',
    'Generator Facility': r.generator_facility,
    'Waste Category': r.waste_category,
    'HCRW Super Category': r.hcrw_super,
    'Container Type': r.container_type,
    'Containers Received': r.containers,
    'Nett Weight kg': r.nett_kg,
    'Reusable': r.reusable ? 'Yes' : 'No',
    'Tracking Number': r.tracking,
  })), file('received-waste', scope));
}
