export type KeyCategory =
  | 'student'
  | 'guardian'
  | 'academic'
  | 'hifz'
  | 'exam'
  | 'finance'
  | 'staff'
  | 'institution'
  | 'system'
  | 'signatures'
  | 'general'
  | 'custom';

export interface KeyTaxonomyItem {
  key: string;
  label: string;
  category: KeyCategory;
  example: string;
  description?: string;
  isCustom?: boolean;
}

export interface CustomKeyDefinition {
  key: string;
  label: string;
  defaultValue?: string;
  category?: KeyCategory;
  createdAt: string;
}

export type DocumentScopeId =
  | 'exam_admit_card'
  | 'tabulation_sheet'
  | 'marksheet_transcript'
  | 'fee_voucher'
  | 'student_id_card'
  | 'character_certificate'
  | 'hifz_daily_report'
  | 'attendance_register'
  | 'staff_id_card'
  | 'general_document';

export interface DocumentScopeDefinition {
  id: DocumentScopeId;
  name: string;
  category: 'Academic' | 'Examination' | 'Financial' | 'Staff' | 'Certificates' | 'General';
  description: string;
  iconName: string;
  recommendedPaperSize: 'A4' | 'LEGAL' | 'LETTER' | 'ID_CARD';
  recommendedOrientation: 'PORTRAIT' | 'LANDSCAPE';
  defaultKeys: string[];
  requiredKeys: string[];
  recommendedKeys: string[];
}

export interface ScopeValidationResult {
  isValid: boolean;
  scopeId: DocumentScopeId;
  scopeName: string;
  matchedRequiredKeys: string[];
  missingRequiredKeys: string[];
  matchedRecommendedKeys: string[];
  missingRecommendedKeys: string[];
  matchScore: number;
  validationMessage: string;
}

