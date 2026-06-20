import type { TabDef } from '../../components/SectionTabs';

// Tabs for each grouped Commercial section. Keeps the sidebar to a few entries
// while exposing sub-pages as in-page tabs.

export const CLIENT_TABS: TabDef[] = [
  { to: '/commercial/clients', label: 'Accounts' },
  { to: '/commercial/contacts', label: 'Contacts' },
  { to: '/commercial/activities', label: 'Activities' },
  { to: '/commercial/sites', label: 'Sites' },
  { to: '/commercial/users', label: 'Users & Access' },
];

export const SUPPLIER_TABS: TabDef[] = [
  { to: '/commercial/suppliers', label: 'Overview', end: true },
  { to: '/commercial/suppliers/history', label: 'History' },
];

export const RECEIVED_TABS: TabDef[] = [
  { to: '/commercial/upload', label: 'Upload' },
  { to: '/commercial/imports', label: 'Import History' },
  { to: '/commercial/import-errors', label: 'Import Errors' },
];

export const ANALYTICS_TABS: TabDef[] = [
  { to: '/commercial/dashboard', label: 'Dashboard' },
  { to: '/commercial/reports', label: 'Reports' },
  // Imports groups the received-waste import pages (Upload / History / Errors)
  // under one parent tab; `match` keeps it active across all three routes.
  { to: '/commercial/upload', label: 'Imports', match: ['/commercial/upload', '/commercial/imports', '/commercial/import-errors'] },
];

export const ESG_TABS: TabDef[] = [
  { to: '/commercial/esg', label: 'Setup', end: true },
  { to: '/commercial/esg/factors', label: 'Factors' },
  { to: '/commercial/esg/operational', label: 'Operational Data' },
  { to: '/commercial/esg/recalculate', label: 'Recalculate & Review' },
  { to: '/commercial/esg/credits', label: 'Carbon Credits' },
];
