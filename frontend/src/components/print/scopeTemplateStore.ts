import { DocumentScopeDefinition, DocumentScopeId, ScopeValidationResult, KeyTaxonomyItem } from './keyLibrary/types';
import { CustomDocxTemplate, getSavedDocxTemplates, saveDocxTemplate } from './docxTemplateEngine';
import { UNIVERSAL_KEY_TAXONOMY } from './keyLibrary/universalKeyTaxonomy';

const SCOPE_DEFAULTS_STORAGE_KEY = 'spr_print_scope_default_templates_v1';
const SCOPE_TEMPLATES_STORAGE_KEY = 'spr_print_scope_custom_templates_v1';

export const ALL_DOCUMENT_SCOPES: DocumentScopeDefinition[] = [
  {
    id: 'tabulation_sheet',
    name: 'Mark Sheet & Tabulation Ledger',
    category: 'Examination',
    description: 'Multi-student grade sheets, class master ledgers, and merit standings',
    iconName: 'ChartBarIcon',
    recommendedPaperSize: 'LEGAL',
    recommendedOrientation: 'LANDSCAPE',
    requiredKeys: ['class_name', 'exam_name', 'student_name', 'roll_number', 'total_marks', 'obtained_marks', 'gpa', 'grade', 'institution_name'],
    recommendedKeys: ['section_name', 'academic_session', 'merit_position', 'issue_date', 'principal_signature', 'exam_controller_signature'],
    defaultKeys: ['class_name', 'section_name', 'exam_name', 'academic_session', 'student_name', 'roll_number', 'total_marks', 'obtained_marks', 'gpa', 'grade', 'institution_name', 'principal_signature', 'exam_controller_signature'],
  },
  {
    id: 'marksheet_transcript',
    name: 'Academic Transcript & Marksheet',
    category: 'Examination',
    description: 'Individual student evaluation report card and progress summary',
    iconName: 'AcademicCapIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['student_name', 'roll_number', 'student_id', 'class_name', 'section_name', 'academic_session', 'exam_name', 'total_marks', 'obtained_marks', 'highest_marks', 'gpa', 'grade'],
    recommendedKeys: ['merit_position', 'division', 'student_photo', 'issue_date', 'principal_signature', 'class_teacher_signature', 'exam_controller_signature', 'guardian_signature'],
    defaultKeys: ['student_name', 'roll_number', 'student_id', 'class_name', 'section_name', 'academic_session', 'exam_name', 'total_marks', 'obtained_marks', 'highest_marks', 'gpa', 'grade', 'merit_position', 'principal_signature'],
  },
  {
    id: 'exam_admit_card',
    name: 'Admit Card & Seat Slip',
    category: 'Examination',
    description: 'Student exam hall entry pass, roll slips, and seating logistics',
    iconName: 'IdentificationIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['student_name', 'roll_number', 'class_name', 'exam_name', 'institution_name'],
    recommendedKeys: ['section_name', 'student_id', 'hall_name', 'seat_number', 'student_photo', 'issue_date', 'principal_signature'],
    defaultKeys: ['student_name', 'roll_number', 'student_id', 'class_name', 'section_name', 'exam_name', 'hall_name', 'seat_number', 'student_photo', 'institution_name', 'principal_signature'],
  },
  {
    id: 'fee_voucher',
    name: 'Fee Slip & Payment Voucher',
    category: 'Financial',
    description: 'Student monthly billing invoice, receipt voucher, and accounts copy',
    iconName: 'FileIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['student_name', 'roll_number', 'class_name', 'voucher_no', 'fee_amount', 'paid_amount', 'institution_name'],
    recommendedKeys: ['due_amount', 'due_date', 'payment_status', 'issue_date', 'principal_signature'],
    defaultKeys: ['student_name', 'roll_number', 'class_name', 'voucher_no', 'fee_type', 'fee_amount', 'paid_amount', 'due_amount', 'due_date', 'payment_status', 'institution_name'],
  },
  {
    id: 'student_id_card',
    name: 'Student Identity Card',
    category: 'Academic',
    description: 'Student photo ID card badge with barcode/QR verification',
    iconName: 'IdentificationIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['student_name', 'roll_number', 'student_id', 'class_name', 'institution_name'],
    recommendedKeys: ['blood_group', 'guardian_phone', 'student_photo', 'qr_verification_code', 'principal_signature'],
    defaultKeys: ['student_name', 'roll_number', 'student_id', 'class_name', 'blood_group', 'guardian_phone', 'student_photo', 'institution_name', 'qr_verification_code'],
  },
  {
    id: 'character_certificate',
    name: 'Character Certificate & Testimonial',
    category: 'Certificates',
    description: 'Formal institutional testimonial, clearance, and completion certificate',
    iconName: 'SparklesIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'LANDSCAPE',
    requiredKeys: ['student_name', 'father_name', 'class_name', 'academic_session', 'institution_name', 'issue_date', 'principal_signature'],
    recommendedKeys: ['roll_number', 'dob', 'grade'],
    defaultKeys: ['student_name', 'father_name', 'roll_number', 'class_name', 'academic_session', 'institution_name', 'issue_date', 'principal_signature'],
  },
  {
    id: 'hifz_daily_report',
    name: 'Daily Hifz & Recitation Report',
    category: 'Academic',
    description: 'Daily Quran memorization record, sabaq tracker, and mistakes log',
    iconName: 'BookOpenIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['student_name', 'roll_number', 'current_juz', 'teacher_name', 'issue_date', 'institution_name'],
    recommendedKeys: ['current_surah', 'sabaq_pages', 'sabqi_juz', 'manzil_juz'],
    defaultKeys: ['student_name', 'roll_number', 'current_juz', 'current_surah', 'sabaq_pages', 'sabqi_juz', 'manzil_juz', 'teacher_name', 'issue_date'],
  },
  {
    id: 'attendance_register',
    name: 'Monthly Attendance Register',
    category: 'Academic',
    description: 'Classroom roll call register, monthly presence matrix, and leave counts',
    iconName: 'MatrixIcon',
    recommendedPaperSize: 'LEGAL',
    recommendedOrientation: 'LANDSCAPE',
    requiredKeys: ['class_name', 'academic_session', 'institution_name', 'issue_date'],
    recommendedKeys: ['section_name', 'department_name', 'class_teacher_signature', 'principal_signature'],
    defaultKeys: ['class_name', 'section_name', 'academic_session', 'department_name', 'institution_name', 'class_teacher_signature'],
  },
  {
    id: 'staff_id_card',
    name: 'Staff Identity Card',
    category: 'Staff',
    description: 'Teacher and employee official identification credential badge',
    iconName: 'TeacherIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['staff_name', 'department_name', 'institution_name'],
    recommendedKeys: ['designation', 'employee_id', 'blood_group', 'emergency_contact', 'principal_signature'],
    defaultKeys: ['staff_name', 'designation', 'employee_id', 'department_name', 'blood_group', 'emergency_contact', 'institution_name', 'principal_signature'],
  },
  {
    id: 'general_document',
    name: 'General Document & Notice',
    category: 'General',
    description: 'Custom letters, official announcements, notices, and memoranda',
    iconName: 'DocumentIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['institution_name'],
    recommendedKeys: ['institution_logo', 'campus_address', 'issue_date', 'principal_signature'],
    defaultKeys: ['institution_name', 'institution_logo', 'campus_address', 'issue_date', 'principal_signature'],
  },
];

/**
 * Returns list of all defined document scopes
 */
export function getAllDocumentScopes(): DocumentScopeDefinition[] {
  return ALL_DOCUMENT_SCOPES;
}

/**
 * Retrieves scope definition by its ID
 */
export function getScopeById(scopeId: string): DocumentScopeDefinition | undefined {
  return ALL_DOCUMENT_SCOPES.find((s) => s.id === scopeId);
}

/**
 * Extracts all placeholder tag names from raw HTML or text (e.g. {{student_name}} or {roll_number})
 */
export function extractTagsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{{1,2}\s*([a-zA-Z0-9_]+)\s*\}{1,2}/g) || [];
  const tags = new Set<string>();
  matches.forEach((m) => {
    const clean = m.replace(/[\{\}\s]/g, '').toLowerCase();
    if (clean) tags.add(clean);
  });
  return Array.from(tags);
}

/**
 * Validates whether a template satisfies the required and recommended keys for a specific scope.
 */
export function validateTemplateForScope(
  template: { rawHtml?: string; html?: string; detectedPlaceholders?: Array<string | { key?: string; name?: string }> } | string | string[],
  scopeIdOrDefinition: string | DocumentScopeDefinition | any
): ScopeValidationResult {
  const scope: DocumentScopeDefinition = typeof scopeIdOrDefinition === 'object' && scopeIdOrDefinition !== null
    ? scopeIdOrDefinition
    : getScopeById(scopeIdOrDefinition) || getScopeById('general_document') || {
        id: String(scopeIdOrDefinition || 'general_document'),
        name: 'General Document',
        category: 'Document',
        description: 'Standard document template',
        requiredKeys: [],
        recommendedKeys: [],
        defaultKeys: [],
      };
  
  // Extract keys present in the template
  let presentKeySet = new Set<string>();
  if (Array.isArray(template)) {
    template.forEach((k) => presentKeySet.add(String(k).toLowerCase()));
  } else if (typeof template === 'string') {
    extractTagsFromText(template).forEach((k) => presentKeySet.add(k));
  } else if (template && typeof template === 'object') {
    if (Array.isArray(template.detectedPlaceholders)) {
      template.detectedPlaceholders.forEach((p) => {
        const key = typeof p === 'string' ? p : p?.key || p?.name;
        if (key) presentKeySet.add(String(key).toLowerCase());
      });
    }
    const html = template.html || template.rawHtml;
    if (html) {
      extractTagsFromText(html).forEach((k) => presentKeySet.add(k));
    }
  }

  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const matchedRecommended: string[] = [];
  const missingRecommended: string[] = [];

  const KEY_SYNONYMS: Record<string, string[]> = {
    student_name: ['studentname', 'name', 'student_full_name', 'fullname'],
    roll_number: ['rollnumber', 'roll', 'roll_no', 'rollno'],
    student_id: ['studentid', 'student_uniq_id', 'uniq_id', 'reg_no', 'regno', 'student_code'],
    class_name: ['classname', 'class', 'grade_level', 'target_class'],
    section_name: ['sectionname', 'section', 'branch_name', 'branch'],
    academic_session: ['academicsession', 'session', 'academic_year', 'academicyear', 'session_year'],
    exam_name: ['examname', 'exam', 'examination', 'exam_title'],
    total_marks: ['totalmarks', 'total_full_marks', 'totalfull', 'total_max_marks', 'total'],
    obtained_marks: ['obtainedmarks', 'total_obtained', 'totalobtained', 'obtained'],
    highest_marks: ['highestmarks', 'highest_total', 'highesttotal', 'highest', 'class_highest'],
    gpa: ['gpa_score', 'overall_gpa', 'gp', 'grade_point_average'],
    grade: ['letter_grade', 'overall_grade', 'final_grade', 'result_grade'],
  };

  const isKeyPresent = (targetKey: string): boolean => {
    const lower = targetKey.toLowerCase();
    if (presentKeySet.has(lower)) return true;
    const norm = lower.replace(/[^a-z0-9]/g, '');
    if (presentKeySet.has(norm)) return true;
    const synonyms = KEY_SYNONYMS[lower] || [];
    return synonyms.some((syn) => presentKeySet.has(syn) || presentKeySet.has(syn.replace(/[^a-z0-9]/g, '')));
  };

  (scope.requiredKeys || []).forEach((reqKey) => {
    if (isKeyPresent(reqKey)) {
      matchedRequired.push(reqKey);
    } else {
      missingRequired.push(reqKey);
    }
  });

  (scope.recommendedKeys || []).forEach((recKey) => {
    if (isKeyPresent(recKey)) {
      matchedRecommended.push(recKey);
    } else {
      missingRecommended.push(recKey);
    }
  });

  const totalRequired = scope.requiredKeys.length;
  const isFullyValid = missingRequired.length === 0;
  const matchScore = totalRequired > 0 ? Math.round((matchedRequired.length / totalRequired) * 100) : 100;

  let validationMessage = isFullyValid
    ? `Template is 100% compliant with ${scope.name}.`
    : `Missing ${missingRequired.length} required key(s) for ${scope.name}: ${missingRequired.map((k) => `{{${k}}}`).join(', ')}`;

  return {
    isValid: isFullyValid,
    scopeId: scope.id,
    scopeName: scope.name,
    matchedRequiredKeys: matchedRequired,
    missingRequiredKeys: missingRequired,
    matchedRecommendedKeys: matchedRecommended,
    missingRecommendedKeys: missingRecommended,
    matchScore,
    validationMessage,
  };
}

/**
 * Returns the rich taxonomy objects for required and recommended keys of a scope
 */
export function getScopeKeysBlueprint(scopeId: string): {
  scope: DocumentScopeDefinition;
  required: KeyTaxonomyItem[];
  recommended: KeyTaxonomyItem[];
} {
  const scope = getScopeById(scopeId) || getScopeById('general_document')!;
  const keyMap = new Map<string, KeyTaxonomyItem>();
  UNIVERSAL_KEY_TAXONOMY.forEach((item) => keyMap.set(item.key.toLowerCase(), item));

  const required = (scope.requiredKeys || []).map((k) => {
    return keyMap.get(k.toLowerCase()) || {
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      category: 'custom' as const,
      example: `[${k}]`,
    };
  });

  const recommended = (scope.recommendedKeys || []).map((k) => {
    return keyMap.get(k.toLowerCase()) || {
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      category: 'custom' as const,
      example: `[${k}]`,
    };
  });

  return { scope, required, recommended };
}

/**
 * Gets saved templates that belong or are compatible with a specific scope
 */
export function getSavedTemplatesForScope(scopeId: string, onlyValid: boolean = false): CustomDocxTemplate[] {
  const allTemplates = getSavedDocxTemplates();
  return allTemplates.filter((t) => {
    if (t.scopeId === scopeId) {
      if (!onlyValid) return true;
      const val = validateTemplateForScope(t, scopeId);
      return val.isValid;
    }
    // Also include general templates if they validate against this scope
    if (onlyValid) {
      const val = validateTemplateForScope(t, scopeId);
      return val.isValid;
    }
    return false;
  });
}

/**
 * Gets the map of default template IDs assigned to each scope
 */
export function getScopeDefaultMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SCOPE_DEFAULTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn('Failed to load scope default template map', e);
  }
  return {};
}

/**
 * Sets a template as the default for a specific scope (with validation warning check)
 */
export function setDefaultTemplateForScope(scopeId: string, templateId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getScopeDefaultMap();
    if (!templateId) {
      delete current[scopeId];
    } else {
      current[scopeId] = templateId;
    }
    localStorage.setItem(SCOPE_DEFAULTS_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('spr_print_scope_default_changed', { detail: { scopeId, templateId } }));
  } catch (e) {
    console.error('Failed to set default template for scope', e);
  }
}

/**
 * Gets the active default template ID for a specific scope
 */
export function getDefaultTemplateIdForScope(scopeId: string): string | null {
  const map = getScopeDefaultMap();
  return map[scopeId] || null;
}

/**
 * Retrieves the full CustomDocxTemplate assigned as default for a scope (if any)
 */
export function getDefaultTemplateForScope(scopeId: string): CustomDocxTemplate | null {
  const defaultTemplateId = getDefaultTemplateIdForScope(scopeId);
  if (!defaultTemplateId) return null;
  const allTemplates = getSavedDocxTemplates();
  return allTemplates.find((t) => t.id === defaultTemplateId) || null;
}

