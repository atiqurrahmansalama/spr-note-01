export interface GradingTierRule {
  grade: string;
  title?: string;
  minMark: number;
  maxMark: number;
  gradePoint?: number;
  division: string;
  isPass: boolean;
  color?: string;
}

export interface GradingSystemPolicy {
  id: string;
  name: string;
  code: string;
  description?: string;
  includeGradePoint?: boolean;
  isDefault?: boolean;
  rules: GradingTierRule[];
}

export interface GradingRuleFormDrawerProps {
  system?: GradingSystemPolicy | null;
  tenantId?: string;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}
