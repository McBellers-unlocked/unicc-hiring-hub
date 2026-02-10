// Lifecycle stages with KPI day markers (counting back from Day 0 = contract start)
export const LIFECYCLE_STAGES = [
  { 
    key: 'contract_break_prep', 
    label: 'Contract Break Preparations', 
    dayMarker: -45,
    description: 'Prepare consultant for contract break period'
  },
  { 
    key: 'purchase_request', 
    label: 'Purchase Request', 
    dayMarker: -30,
    description: 'Initiate and complete purchase request'
  },
  { 
    key: 'documentation', 
    label: 'Documentation', 
    dayMarker: -20,
    description: 'Gather and verify all required documents'
  },
  { 
    key: 'purchase_order', 
    label: 'Purchase Order', 
    dayMarker: -14,
    description: 'Generate and process purchase order'
  },
  { 
    key: 'stakeholders_update', 
    label: 'Stakeholders Update', 
    dayMarker: 0,
    description: 'Notify all relevant stakeholders'
  },
] as const;

export type LifecycleStageKey = typeof LIFECYCLE_STAGES[number]['key'];

// Default checklist items for each stage
export const DEFAULT_CHECKLIST_ITEMS: Record<LifecycleStageKey, { key: string; label: string }[]> = {
  contract_break_prep: [
    { key: 'timesheet_reminder', label: 'Timesheet reminder to consultant' },
    { key: 'evaluation_form_receival', label: 'Evaluation form receival' },
    { key: 'contract_break_ticket_email', label: 'Contract break ticket email' },
  ],
  purchase_request: [
    { key: 'confirm_appointment_duration', label: 'Confirm appointment duration' },
    { key: 'validate_account_codes', label: 'Validate account codes' },
    { key: 'create_rate_determination', label: 'Create rate determination spreadsheet' },
    { key: 'raise_pr', label: 'Raise PR' },
    { key: 'wait_pr_approval', label: 'Wait for PR Approval' },
  ],
  documentation: [
    { key: 'draft_selection_report', label: 'Draft Selection Report' },
    { key: 'wait_manager_signature_sr', label: 'Wait for manager signature on SR' },
    { key: 'wait_division_chief_signature_sr', label: 'Wait for Division Chief signature on SR' },
    { key: 'wait_director_signature_sr', label: 'Wait for Director signature on SR' },
    { key: 'issue_contract_hr_signature', label: 'Issue contract for HR signature' },
    { key: 'issue_contract_incumbent_signature', label: 'Issue contract for incumbent signature' },
    { key: 'receive_signed_contract', label: 'Receive signed contract' },
  ],
  purchase_order: [
    { key: 'draft_gsm_po', label: 'Draft GSM PO' },
    { key: 'add_po_attachments', label: 'Add PO attachments' },
    { key: 'wait_po_approval', label: 'Wait PO approval' },
    { key: 'insert_reference_dynamics', label: 'Insert reference in Dynamics' },
    { key: 'countersign_contract', label: 'Countersign contract' },
  ],
  stakeholders_update: [
    { key: 'share_record_who_insurance', label: 'Share record for WHO Insurance' },
    { key: 'ask_manager_restore_account', label: 'Ask manager to restore account' },
    { key: 'inform_accounts_payable', label: 'Inform accounts payable' },
    { key: 'update_userbase', label: 'Update userbase' },
  ],
};

// Extension workflow (no contract break) - subset of stages
export const EXTENSION_STAGES = ['documentation', 'purchase_order', 'stakeholders_update'] as const;

export interface ChecklistItem {
  id: string;
  user_id: string;
  contract_cycle_start: string | null;
  contract_cycle_end: string | null;
  next_contract_start: string | null;
  stage: string;
  item_key: string;
  item_label: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type StageStatus = 'complete' | 'pending' | 'overdue';

export const getStageStatus = (
  stageKey: string,
  daysToOnboard: number,
  checklist: ChecklistItem[]
): StageStatus => {
  const stage = LIFECYCLE_STAGES.find(s => s.key === stageKey);
  if (!stage) return 'pending';
  
  const stageItems = checklist.filter(item => item.stage === stageKey);
  
  // If no items exist for this stage, consider it pending
  if (stageItems.length === 0) return 'pending';
  
  const allComplete = stageItems.every(item => item.completed);
  
  // KPI has passed if we're past the day marker
  // e.g., if dayMarker is -30 and daysToOnboard is 25, KPI has passed (25 < 30)
  const kpiPassed = daysToOnboard < Math.abs(stage.dayMarker);
  
  if (allComplete) return 'complete';
  if (kpiPassed) return 'overdue';
  return 'pending';
};

export const getStageColorClass = (status: StageStatus): string => {
  switch (status) {
    case 'complete':
      return 'bg-green-500 border-green-600';
    case 'overdue':
      return 'bg-red-500 border-red-600';
    case 'pending':
    default:
      return 'bg-blue-500 border-blue-600';
  }
};

export const getStageTextColorClass = (status: StageStatus): string => {
  switch (status) {
    case 'complete':
      return 'text-green-600';
    case 'overdue':
      return 'text-red-600';
    case 'pending':
    default:
      return 'text-blue-600';
  }
};
