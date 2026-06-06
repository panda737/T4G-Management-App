import type { SafetyRiskAssessment } from '../../lib/supabase';

export type RiskStatus = 'Draft' | 'Active' | 'Under Review' | 'Archived';

export const STATUS_TABS = ['All', 'Active', 'Draft', 'Under Review', 'Archived'] as const;

export const EMPTY_FORM: Partial<SafetyRiskAssessment> = {
  assessment_date: new Date().toISOString().split('T')[0],
  area: '',
  activity: '',
  hazard: '',
  risk_description: '',
  likelihood: 1,
  consequence: 1,
  existing_controls: '',
  additional_controls: '',
  responsible_person: '',
  assessed_by: '',
  review_date: '',
  status: 'Draft',
};

export function calculateRiskRating(likelihood: number, consequence: number) {
  return likelihood * consequence;
}

export function getRiskLevel(rating: number): 'Low' | 'Medium' | 'High' | 'Extreme' {
  if (rating <= 4) return 'Low';
  if (rating <= 9) return 'Medium';
  if (rating <= 14) return 'High';
  return 'Extreme';
}
