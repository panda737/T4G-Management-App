import type { TabDef } from '../../components/SectionTabs';

// Sub-tabs for the Compliance section. Overview is still under development;
// Biological Indicator is the first functional tab.
export const COMPLIANCE_TABS: TabDef[] = [
  { to: '/compliance', label: 'Overview', end: true },
  { to: '/compliance/biological-indicator', label: 'Biological Indicator' },
];
