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
    { key: 'remind_timesheet', label: 'Remind consultant of Timesheet' },
    { key: 'evaluation_form', label: 'Evaluation form reminder' },
    { key: 'contract_break_ticket', label: 'Send Contract Break ticket' },
  ],
  purchase_request: [
    { key: 'confirm_account_codes', label: 'Confirm account codes' },
    { key: 'raise_pr', label: 'Raise PR' },
    { key: 'pr_completed', label: 'PR completed' },
  ],
  documentation: [
    { key: 'verify_documents', label: 'Verify all documents received' },
    { key: 'check_compliance', label: 'Check compliance requirements' },
    { key: 'update_records', label: 'Update personnel records' },
  ],
  purchase_order: [
    { key: 'generate_po', label: 'Generate Purchase Order' },
    { key: 'po_approval', label: 'PO approved' },
    { key: 'send_po', label: 'Send PO to consultant' },
  ],
  stakeholders_update: [
    { key: 'notify_division', label: 'Notify division/unit' },
    { key: 'update_systems', label: 'Update HR systems' },
    { key: 'welcome_communication', label: 'Send welcome/return communication' },
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
