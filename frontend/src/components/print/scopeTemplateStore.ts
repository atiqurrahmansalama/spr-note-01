import { DocumentScopeDefinition, ScopeValidationResult, KeyTaxonomyItem } from './keyLibrary/types';
import { CustomDocxTemplate, getSavedDocxTemplates, UNIVERSAL_SYNONYM_GROUPS } from './docxTemplateEngine';
import { createDynamicKeyItem } from './keyLibrary/universalKeyTaxonomy';

export type { CustomDocxTemplate };

const SCOPE_DEFAULTS_STORAGE_KEY = 'spr_print_scope_default_templates_v1';

export const ALL_DOCUMENT_SCOPES: DocumentScopeDefinition[] = [
  {
    id: 'tabulation_sheet',
    name: 'Mark Sheet & Tabulation Ledger',
    category: 'Examination',
    description: 'Multi-student grade sheets, class master ledgers, and merit standings',
    iconName: 'ChartBarIcon',
    recommendedPaperSize: 'LEGAL',
    recommendedOrientation: 'LANDSCAPE',
    requiredKeys: ['class_name', 'exam_name', 'student_name', 'roll_number', 'total_marks', 'obtained_marks', 'average_marks', 'gpa', 'grade', 'merit_position', 'result_status', 'institution_name'],
    recommendedKeys: ['section_name', 'academic_session', 'merit_status', 'highest_marks', 'issue_date', 'principal_signature', 'exam_controller_signature'],
    defaultKeys: ['class_name', 'section_name', 'exam_name', 'academic_session', 'student_name', 'roll_number', 'total_marks', 'obtained_marks', 'average_marks', 'gpa', 'grade', 'merit_position', 'result_status', 'institution_name', 'principal_signature', 'exam_controller_signature'],
  },
  {
    id: 'marksheet_transcript',
    name: 'Academic Transcript & Marksheet',
    category: 'Examination',
    description: 'Individual student evaluation report card and progress summary',
    iconName: 'AcademicCapIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: ['student_name', 'roll_number', 'student_id', 'class_name', 'section_name', 'academic_session', 'exam_name', 'total_marks', 'obtained_marks', 'average_marks', 'highest_marks', 'gpa', 'grade', 'merit_position', 'result_status'],
    recommendedKeys: ['merit_status', 'division', 'result_summary', 'student_photo', 'issue_date', 'principal_signature', 'class_teacher_signature', 'exam_controller_signature', 'guardian_signature'],
    defaultKeys: ['student_name', 'roll_number', 'student_id', 'class_name', 'section_name', 'academic_session', 'exam_name', 'total_marks', 'obtained_marks', 'average_marks', 'highest_marks', 'gpa', 'grade', 'merit_position', 'merit_status', 'result_status', 'principal_signature'],
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
    name: 'Daily Progress & Hifz Report',
    category: 'Academic',
    description: 'Daily Quran memorization record, sabaq tracker, mistakes, and stuck points',
    iconName: 'BookOpenIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'PORTRAIT',
    requiredKeys: [
      'date',
      'student-name',
      'dept',
      'class',
      'section',
      'juz-number',
      'juz-page',
      'Session',
      'total-mis',
      'total-stuck',
      'detail-mis',
      'detail-stuck',
      'mention-teacher-name',
      'remarks',
    ],
    recommendedKeys: [],
    defaultKeys: [
      'date',
      'student-name',
      'dept',
      'class',
      'section',
      'juz-number',
      'juz-page',
      'Session',
      'total-mis',
      'total-stuck',
      'detail-mis',
      'detail-stuck',
      'mention-teacher-name',
      'remarks',
    ],
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
    id: 'subject_routine',
    name: 'Examination Subject Routine',
    category: 'Examination',
    description: 'Class-wise and shift-wise examination date routine and subject timetable matrix',
    iconName: 'BookOpenIcon',
    recommendedPaperSize: 'A4',
    recommendedOrientation: 'LANDSCAPE',
    requiredKeys: ['exam-name', 'academic-year', 'exam-date', 'day-name', 'shift', 'shift-time', 'class', 'class-sub1'],
    recommendedKeys: [],
    defaultKeys: ['exam-name', 'academic-year', 'exam-date', 'day-name', 'shift', 'shift-time', 'class', 'class-sub1'],
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

export const SCOPE_ALIASES: Record<string, string> = {
  examinations_admit_card: 'exam_admit_card',
  examination_admit_card: 'exam_admit_card',
  examinations_attendance_sheet: 'attendance_register',
  examinations_desk_slips: 'exam_admit_card',
  daily_progress: 'hifz_daily_report',
  hifz_progress: 'hifz_daily_report',
  student_marksheet: 'marksheet_transcript',
  tabulation_ledger: 'tabulation_sheet',
};

/**
 * Returns list of all defined document scopes
 */
export function getAllDocumentScopes(): DocumentScopeDefinition[] {
  return ALL_DOCUMENT_SCOPES;
}

/**
 * Retrieves scope definition by its ID, supporting aliases
 */
export function getScopeById(scopeId?: string | null): DocumentScopeDefinition | undefined {
  if (!scopeId) return undefined;
  const canonicalId = SCOPE_ALIASES[scopeId] || scopeId;
  return ALL_DOCUMENT_SCOPES.find((s) => s.id === canonicalId);
}

/**
 * Extracts all placeholder tag names from raw HTML or text (e.g. {{student_name}}, {{detail-mis | indent: 7}} or {roll_number})
 */
export function extractTagsFromText(text: string): string[] {
  if (!text) return [];
  const matches: string[] = text.match(/\{{1,2}\s*([a-zA-Z0-9_\-|:'",<>&;\s]+?)\s*\}{1,2}/g) || [];
  const tags = new Set<string>();
  matches.forEach((m) => {
    const raw = m.replace(/[\{\}]/g, '').trim();
    const baseKey = raw.split(/[|<]/)[0].trim().toLowerCase();
    const clean = baseKey.replace(/[\s]/g, '');
    if (clean) tags.add(clean);
  });
  return Array.from(tags);
}

/**
 * Resolves the true canonical scope of a template dynamically
 * using schema key validation and title heuristic scoring (zero hardcoded static branches).
 */
export function resolveTemplateScopeId(template: any): string {
  if (!template) return 'general_document';

  const rawScope = template.scopeId || template.templateMeta?.scopeId;
  const canonicalRaw = rawScope ? (SCOPE_ALIASES[rawScope] || rawScope) : null;

  // Extract all tags from the template
  const templateHtml = template.rawHtml || template.html || '';
  const detectedKeys = Array.isArray(template.detectedPlaceholders)
    ? template.detectedPlaceholders.map((p: any) => (typeof p === 'string' ? p : p?.key || p?.name || ''))
    : [];
  const tags = extractTagsFromText(templateHtml);
  const allTemplateTokens = new Set<string>(
    [...tags, ...detectedKeys].map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );

  const templateName = String(template.name || template.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // Compute best matching scope based on schema definitions
  let bestScopeId: string | null = null;
  let highestScore = 0;

  ALL_DOCUMENT_SCOPES.forEach((scope) => {
    if (scope.id === 'general_document') return;

    let score = 0;

    // 1. Title keyword matching dynamically from scope metadata
    const scopeKeywords = [
      ...scope.name.toLowerCase().split(/[\s&/_-]+/),
      ...scope.id.toLowerCase().split(/[\s&/_-]+/),
    ].filter((w) => w.length > 2);

    scopeKeywords.forEach((kw) => {
      if (templateName.includes(kw)) {
        score += 15;
      }
    });

    // 2. Placeholder key overlap from scope required/default keys
    const scopeKeys = [...(scope.requiredKeys || []), ...(scope.defaultKeys || [])];
    scopeKeys.forEach((key) => {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey && allTemplateTokens.has(cleanKey)) {
        score += 10;
      }
    });

    // 3. Raw scope match bonus
    if (canonicalRaw === scope.id) {
      score += 20;
    }

    if (score > highestScore) {
      highestScore = score;
      bestScopeId = scope.id;
    }
  });

  if (bestScopeId && highestScore >= 20) {
    return bestScopeId;
  }

  if (canonicalRaw && ALL_DOCUMENT_SCOPES.some((s) => s.id === canonicalRaw)) {
    return canonicalRaw;
  }

  return 'general_document';
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
  const presentKeySet = new Set<string>();
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

  const isKeyPresent = (targetKey: string): boolean => {
    const lower = targetKey.toLowerCase();
    if (presentKeySet.has(lower)) return true;
    const norm = lower.replace(/[^a-z0-9]/g, '');
    if (presentKeySet.has(norm)) return true;

    // Check against universal synonym groups from docxTemplateEngine
    const matchingGroup = UNIVERSAL_SYNONYM_GROUPS.find((group) =>
      group.some((syn) => syn.toLowerCase() === lower || syn.replace(/[^a-z0-9]/g, '') === norm)
    );
    if (matchingGroup) {
      return matchingGroup.some((syn) => {
        const synNorm = syn.toLowerCase().replace(/[^a-z0-9]/g, '');
        return presentKeySet.has(syn.toLowerCase()) || presentKeySet.has(synNorm);
      });
    }

    return false;
  };

  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const matchedRecommended: string[] = [];
  const missingRecommended: string[] = [];

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

  const validationMessage = isFullyValid
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
export function getScopeKeysBlueprint(
  scopeId: string,
  providedKeys: KeyTaxonomyItem[] = []
): {
  scope: DocumentScopeDefinition;
  required: KeyTaxonomyItem[];
  recommended: KeyTaxonomyItem[];
} {
  const scope = getScopeById(scopeId) || getScopeById('general_document')!;
  const keyMap = new Map<string, KeyTaxonomyItem>();
  providedKeys.forEach((item) => keyMap.set(item.key.toLowerCase(), item));

  const mapKey = (k: string): KeyTaxonomyItem => {
    return (
      keyMap.get(k.toLowerCase()) ||
      createDynamicKeyItem(
        k,
        k.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        'general',
        `[${k}]`,
        'Document blueprint variable'
      )
    );
  };

  const required = (scope.requiredKeys || []).map(mapKey);
  const recommended = (scope.recommendedKeys || []).map(mapKey);

  return { scope, required, recommended };
}

/**
 * Gets saved templates that belong or are compatible with a specific scope
 */
export function getSavedTemplatesForScope(scopeId: string, onlyValid: boolean = false): CustomDocxTemplate[] {
  const allTemplates = getSavedDocxTemplates();
  const canonicalScope = getScopeById(scopeId)?.id || scopeId;
  const filtered = allTemplates.filter((t) => {
    const tScope = resolveTemplateScopeId(t);
    if (tScope === canonicalScope) {
      if (!onlyValid) return true;
      const val = validateTemplateForScope(t, canonicalScope);
      return val.isValid;
    }
    if (onlyValid) {
      const val = validateTemplateForScope(t, canonicalScope);
      return val.isValid;
    }
    return false;
  });

  return [...filtered].sort((a, b) => {
    const nameA = String(a.name || a.id || '').trim().toLowerCase();
    const nameB = String(b.name || b.id || '').trim().toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
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
    const canonicalScope = getScopeById(scopeId)?.id || scopeId;
    const current = getScopeDefaultMap();
    if (!templateId) {
      delete current[canonicalScope];
    } else {
      current[canonicalScope] = templateId;
    }
    localStorage.setItem(SCOPE_DEFAULTS_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('spr_print_scope_default_changed', { detail: { scopeId: canonicalScope, templateId } }));
  } catch (e) {
    console.error('Failed to set default template for scope', e);
  }
}

/**
 * Gets the active default template ID for a specific scope
 */
export function getDefaultTemplateIdForScope(scopeId: string): string | null {
  const canonicalScope = getScopeById(scopeId)?.id || scopeId;
  const map = getScopeDefaultMap();
  return map[canonicalScope] || null;
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
