export const APPOINTMENT_LIFECYCLE_STAGES = [
  {
    key: 'offer_letter',
    label: 'Offer Letter',
    dayMarker: -45,
    description: 'Draft, sign, and send offer letter to candidate',
  },
  {
    key: 'medical_clearance',
    label: 'Medical Clearance',
    dayMarker: -35,
    description: 'Request and process medical examination and clearance',
  },
  {
    key: 'visa_travel',
    label: 'Visa & Travel',
    dayMarker: -25,
    description: 'Handle visa requirements and travel arrangements',
  },
  {
    key: 'badge_access',
    label: 'Badge & Access',
    dayMarker: -14,
    description: 'Set up building access, IT accounts, and workstation',
  },
  {
    key: 'contract_signed',
    label: 'Contract Signed',
    dayMarker: -7,
    description: 'Finalize and sign the employment contract',
  },
  {
    key: 'onboarding_complete',
    label: 'Onboarding Complete',
    dayMarker: 0,
    description: 'Complete first-day logistics and orientation',
  },
] as const;

export type AppointmentLifecycleStageKey = typeof APPOINTMENT_LIFECYCLE_STAGES[number]['key'];

export const DEFAULT_APPOINTMENT_CHECKLIST_ITEMS: Record<AppointmentLifecycleStageKey, { key: string; label: string }[]> = {
  offer_letter: [
    { key: 'draft_offer_letter', label: 'Draft offer letter' },
    { key: 'obtain_hr_signature', label: 'Obtain HR signature' },
    { key: 'send_to_candidate', label: 'Send to candidate' },
    { key: 'receive_signed_acceptance', label: 'Receive signed acceptance' },
  ],
  medical_clearance: [
    { key: 'request_medical_exam', label: 'Request medical exam' },
    { key: 'receive_medical_results', label: 'Receive medical results' },
    { key: 'review_approve_clearance', label: 'Review and approve clearance' },
  ],
  visa_travel: [
    { key: 'confirm_visa_requirements', label: 'Confirm visa requirements' },
    { key: 'submit_visa_application', label: 'Submit visa application' },
    { key: 'arrange_travel', label: 'Arrange travel' },
    { key: 'receive_visa_confirmation', label: 'Receive visa confirmation' },
  ],
  badge_access: [
    { key: 'request_building_badge', label: 'Request building access badge' },
    { key: 'request_it_account', label: 'Request IT account creation' },
    { key: 'request_vpn_access', label: 'Request VPN/remote access' },
    { key: 'assign_workstation', label: 'Assign workstation' },
  ],
  contract_signed: [
    { key: 'finalize_contract_terms', label: 'Finalize contract terms' },
    { key: 'issue_contract_signature', label: 'Issue contract for signature' },
    { key: 'receive_signed_contract', label: 'Receive signed contract' },
    { key: 'file_signed_contract', label: 'File signed contract' },
  ],
  onboarding_complete: [
    { key: 'confirm_first_day_logistics', label: 'Confirm first-day logistics' },
    { key: 'welcome_package_sent', label: 'Welcome package sent' },
    { key: 'orientation_scheduled', label: 'Orientation scheduled' },
    { key: 'manager_notified', label: 'Manager notified' },
  ],
};

export interface AppointmentChecklistItem {
  id: string;
  appointment_id: string;
  stage_key: string;
  item_key: string;
  item_label: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

export type AppointmentStageStatus = 'complete' | 'pending' | 'overdue';

export const getAppointmentStageStatus = (
  stageKey: string,
  daysToStart: number,
  checklist: AppointmentChecklistItem[]
): AppointmentStageStatus => {
  const stage = APPOINTMENT_LIFECYCLE_STAGES.find(s => s.key === stageKey);
  if (!stage) return 'pending';

  const stageItems = checklist.filter(item => item.stage_key === stageKey);
  if (stageItems.length === 0) return 'pending';

  const allComplete = stageItems.every(item => item.completed);
  const kpiPassed = daysToStart < Math.abs(stage.dayMarker);

  if (allComplete) return 'complete';
  if (kpiPassed) return 'overdue';
  return 'pending';
};

export const getAppointmentStageColorClass = (status: AppointmentStageStatus): string => {
  switch (status) {
    case 'complete': return 'bg-green-500 border-green-600';
    case 'overdue': return 'bg-red-500 border-red-600';
    case 'pending':
    default: return 'bg-blue-500 border-blue-600';
  }
};

export const getAppointmentStageTextColorClass = (status: AppointmentStageStatus): string => {
  switch (status) {
    case 'complete': return 'text-green-600';
    case 'overdue': return 'text-red-600';
    case 'pending':
    default: return 'text-blue-600';
  }
};
