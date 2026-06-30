import { CheckSquare } from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';
import { PageHeader } from '../../components/ui';
import MobileNavButton from '../../components/MobileNavButton';
import SectionTabs from '../../components/SectionTabs';
import { COMPLIANCE_TABS } from './complianceTabs';

// Landing page for the Compliance section. The overview itself is still being
// built — for now it just frames the section tabs so users can reach the
// functional Biological Indicator tab.
export default function ComplianceOverview() {
  usePageTitle('Compliance');
  return (
    <div className="space-y-4">
      <PageHeader
        title="Compliance"
        subtitle="Unified compliance view across SHEQ, training, treatment and stock"
        icon={CheckSquare}
        accent="teal"
        actions={<MobileNavButton />}
      />
      <SectionTabs tabs={COMPLIANCE_TABS} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
        <CheckSquare size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600">Compliance overview is coming soon</p>
        <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
          We're building this out. In the meantime, use the Biological Indicator tab to
          capture compactor sterility checks.
        </p>
      </div>
    </div>
  );
}
