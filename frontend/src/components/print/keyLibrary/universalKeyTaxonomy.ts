import { KeyCategory, KeyTaxonomyItem, CustomKeyDefinition } from './types';

const CUSTOM_KEYS_STORAGE_KEY = 'spr_custom_print_keys_v1';

export const UNIVERSAL_KEY_TAXONOMY: KeyTaxonomyItem[] = [
  // ─── Table Columns & Row Indexing ───────────────────────────────────
  { key: 'sl', label: 'Serial / Row Number (Sl)', category: 'student', example: '1', description: 'Auto-incrementing table row number' },
  { key: 'index', label: 'Index Number', category: 'student', example: '1', description: 'Sequential list index' },
  { key: 'student_name', label: 'Student Full Name', category: 'student', example: 'Abdullah Al Mamun', description: 'Full legal name of the student' },
  { key: 'student_name_bn', label: 'Student Name (Bengali)', category: 'student', example: 'Abdullah Al Mamun', description: 'Student name in Bengali script' },
  { key: 'roll_number', label: 'Roll Number', category: 'student', example: '01', description: 'Assigned classroom roll number' },
  { key: 'student_id', label: 'Student ID / Reg No', category: 'student', example: 'STD-2026-042', description: 'Unique institutional registration number' },
  { key: 'admission_no', label: 'Admission Number', category: 'student', example: 'ADM-2026-108', description: 'Initial admission form number' },
  { key: 'dob', label: 'Date of Birth', category: 'student', example: '12-05-2012', description: 'Birth date of student' },
  { key: 'gender', label: 'Gender', category: 'student', example: 'Male', description: 'Male / Female' },
  { key: 'blood_group', label: 'Blood Group', category: 'student', example: 'B+ (Positive)', description: 'Medical blood group' },
  { key: 'student_photo', label: 'Student Photograph', category: 'student', example: '[Passport Photo]', description: 'Student profile image embed' },
  { key: 'student_address', label: 'Residential Address', category: 'student', example: 'House 14, Road 5, Mirpur, Dhaka', description: 'Student home address' },

  // ─── Guardian & Contact ───────────────────────────────────────────
  { key: 'father_name', label: 'Father Name', category: 'guardian', example: 'Mohammad Ali', description: 'Full name of student father' },
  { key: 'mother_name', label: 'Mother Name', category: 'guardian', example: 'Fatema Begum', description: 'Full name of student mother' },
  { key: 'guardian_name', label: 'Legal Guardian Name', category: 'guardian', example: 'Mohammad Ali', description: 'Designated legal guardian' },
  { key: 'guardian_phone', label: 'Guardian Mobile Contact', category: 'guardian', example: '+880 1712-345678', description: 'Primary contact number' },
  { key: 'emergency_contact', label: 'Emergency Contact Phone', category: 'guardian', example: '+880 1819-876543', description: 'Alternative phone number' },

  // ─── Academic & Classroom ─────────────────────────────────────────
  { key: 'class_name', label: 'Class / Grade', category: 'academic', example: 'Hifzul Quran', description: 'Current assigned class' },
  { key: 'section_name', label: 'Section / Branch Group', category: 'academic', example: 'Section A (Morning)', description: 'Class section or shift' },
  { key: 'department_name', label: 'Department / Academy', category: 'academic', example: 'Tahfizul Quran & Qiraat', description: 'Academic department' },
  { key: 'academic_session', label: 'Academic Session / Year', category: 'academic', example: '2025 - 2026', description: 'Current fiscal/academic year' },
  { key: 'teacher_name', label: 'Class Teacher / Ustadh', category: 'academic', example: 'Ustadh Mahmud Hasan', description: 'Assigned classroom teacher' },
  { key: 'shift', label: 'Class Shift', category: 'academic', example: 'Morning', description: 'Morning / Day / Residential shift' },

  // ─── Quran / Hifz Specific ────────────────────────────────────────
  { key: 'current_juz', label: 'Current Para / Juz', category: 'hifz', example: 'Juz 15 (Al-Isra)', description: 'Current memorized Juz' },
  { key: 'current_surah', label: 'Current Surah', category: 'hifz', example: 'Surah Al-Baqarah', description: 'Surah currently being recited' },
  { key: 'sabaq_pages', label: 'Daily Sabaq Page Range', category: 'hifz', example: 'Page 120 - 122', description: 'New daily lesson range' },
  { key: 'sabqi_juz', label: 'Sabqi (Recent Review)', category: 'hifz', example: 'Juz 14', description: 'Recent revision block' },
  { key: 'manzil_juz', label: 'Manzil (Cumulative Review)', category: 'hifz', example: 'Juz 1 - 5', description: 'Long-term revision block' },
  { key: 'hifz_status', label: 'Hifz Progress Status', category: 'hifz', example: 'Completed 24 Paras', description: 'Overall completion milestone' },

  // ─── Examination & Evaluation ─────────────────────────────────────
  { key: 'exam_name', label: 'Examination Title', category: 'exam', example: 'Annual Examination 2026', description: 'Exam term title' },
  { key: 'exam_date', label: 'Exam Date', category: 'exam', example: '20-11-2026', description: 'Date of the examination' },
  { key: 'hall_name', label: 'Exam Hall / Room', category: 'exam', example: 'Central Hall - Floor 2', description: 'Assigned examination venue' },
  { key: 'seat_number', label: 'Desk / Seat Number', category: 'exam', example: 'Seat #34', description: 'Desk slip number' },
  { key: 'total_subjects', label: 'Total Subjects Count', category: 'exam', example: '7', description: 'Total number of subjects evaluated' },
  { key: 'total_marks', label: 'Total Aggregate Marks', category: 'exam', example: '500', description: 'Total maximum marks' },
  { key: 'obtained_marks', label: 'Obtained Total Marks', category: 'exam', example: '475', description: 'Total marks secured by student' },
  { key: 'average_marks', label: 'Average Marks', category: 'exam', example: '95.00', description: 'Average marks obtained per subject' },
  { key: 'percentage', label: 'Result Percentage', category: 'exam', example: '95.00%', description: 'Calculated percentage' },
  { key: 'grade', label: 'Letter Grade', category: 'exam', example: 'A+ (Mumtaz)', description: 'Final assigned grade' },
  { key: 'gpa', label: 'GPA Score', category: 'exam', example: '5.00', description: 'Grade Point Average derived from scale' },
  { key: 'merit_position', label: 'Merit Position / Rank', category: 'exam', example: '1st (First Position)', description: 'Class merit standing with ordinal suffix' },
  { key: 'merit_status', label: 'Merit & Result Status', category: 'exam', example: '1st (Mumtaz) • PASSED', description: 'Combined merit position and result status' },
  { key: 'result_status', label: 'Result Status (PASSED/FAILED)', category: 'exam', example: 'PASSED', description: 'Pass or fail qualification status' },
  { key: 'result_summary', label: 'Full Result Summary', category: 'exam', example: 'PASSED • GPA 5.00 (A+) • 1st Position', description: 'Comprehensive single-line academic summary' },
  { key: 'highest_marks', label: 'Class Highest Marks', category: 'exam', example: '495', description: 'Highest total marks scored in class' },
  { key: 'highest_gpa', label: 'Class Highest GPA', category: 'exam', example: '5.00', description: 'Highest GPA achieved in class' },
  { key: 'highest_percentage', label: 'Class Highest Percentage', category: 'exam', example: '99.00%', description: 'Top aggregate score percentage in class' },
  { key: 'highest_grade', label: 'Class Highest Letter Grade', category: 'exam', example: 'A+', description: 'Highest letter grade achieved in class' },
  { key: 'attendance_percentage', label: 'Hall Attendance Rate', category: 'exam', example: '100%', description: 'Exam attendance rate' },

  // ─── Staff & Human Resources ──────────────────────────────────────
  { key: 'staff_name', label: 'Staff / Employee Full Name', category: 'staff', example: 'Mohammad Farooq', description: 'Full legal name of employee' },
  { key: 'designation', label: 'Designation / Post', category: 'staff', example: 'Senior Lecturer', description: 'Job title / designation' },
  { key: 'employee_id', label: 'Employee ID / Staff Code', category: 'staff', example: 'EMP-2026-015', description: 'Unique staff employee code' },
  { key: 'joining_date', label: 'Joining Date', category: 'staff', example: '01-01-2020', description: 'Date of joining institution' },

  // ─── Financial & Fee Vouchers ─────────────────────────────────────
  { key: 'voucher_no', label: 'Fee Voucher / Invoice No', category: 'finance', example: 'VCH-2026-8901', description: 'Unique fee slip invoice number' },
  { key: 'fee_type', label: 'Fee Type / Head', category: 'finance', example: 'Tuition & Residential Fee', description: 'Fee item category' },
  { key: 'fee_amount', label: 'Payable Amount', category: 'finance', example: '৳ 3,500.00', description: 'Total billed amount' },
  { key: 'paid_amount', label: 'Paid Amount', category: 'finance', example: '৳ 3,500.00', description: 'Amount collected' },
  { key: 'due_amount', label: 'Due / Balance Amount', category: 'finance', example: '৳ 0.00', description: 'Outstanding unpaid balance' },
  { key: 'due_date', label: 'Payment Due Date', category: 'finance', example: '10-12-2026', description: 'Last date for payment' },
  { key: 'payment_status', label: 'Payment Status', category: 'finance', example: 'PAID', description: 'PAID / DUE / PARTIAL' },
  { key: 'basic_salary', label: 'Basic Salary Amount', category: 'finance', example: '৳ 35,000.00', description: 'Monthly base salary' },
  { key: 'net_payable', label: 'Net Payable Salary', category: 'finance', example: '৳ 42,500.00', description: 'Final net salary disbursement' },

  // ─── Institutional Branding ───────────────────────────────────────
  { key: 'institution_name', label: 'Institution Name', category: 'institution', example: 'Jamia Islamia Markaz', description: 'Official institution name' },
  { key: 'institution_name_bn', label: 'Institution Name (Bengali)', category: 'institution', example: 'Madrasah & Islamic Academy', description: 'Institution name in Bengali' },
  { key: 'institution_logo', label: 'Official Institution Logo', category: 'institution', example: '[Logo Image]', description: 'Monogram or emblem' },
  { key: 'campus_address', label: 'Campus Address', category: 'institution', example: 'Block D, Section 12, Mirpur, Dhaka-1216', description: 'Full physical address' },
  { key: 'contact_number', label: 'Official Telephone / Mobile', category: 'institution', example: '+880 2-9876543', description: 'Institution helpline' },
  { key: 'official_email', label: 'Official Email Address', category: 'institution', example: 'info@madrasa.edu.bd', description: 'Contact email' },
  { key: 'website_url', label: 'Official Website URL', category: 'institution', example: 'www.madrasa.edu.bd', description: 'Web portal URL' },
  { key: 'tagline', label: 'Institutional Motto / Tagline', category: 'institution', example: 'Excellence in Quranic Studies & Character', description: 'Official motto' },

  // ─── System & Timestamps ──────────────────────────────────────────
  { key: 'issue_date', label: 'Document Issue Date', category: 'system', example: new Date().toLocaleDateString(), description: 'Date of document generation' },
  { key: 'print_time', label: 'Generation Timestamp', category: 'system', example: new Date().toLocaleTimeString(), description: 'Exact generation time' },
  { key: 'serial_no', label: 'Unique Document Serial', category: 'system', example: 'DOC-90821-X', description: 'Document verification serial' },
  { key: 'qr_verification_code', label: 'QR Verification Token', category: 'system', example: '[QR Code]', description: 'Public verification QR image' },

  // ─── Signatures & Authorities ─────────────────────────────────────
  { key: 'principal_signature', label: 'Principal Signature Line', category: 'signatures', example: '_________________\nPrincipal', description: 'Principal seal and signature' },
  { key: 'exam_controller_signature', label: 'Controller of Exams Line', category: 'signatures', example: '_________________\nExam Controller', description: 'Exam authority signature' },
  { key: 'class_teacher_signature', label: 'Class Teacher Signature', category: 'signatures', example: '_________________\nClass Teacher', description: 'Teacher verification signature' },
  { key: 'guardian_signature', label: 'Parent / Guardian Signature', category: 'signatures', example: '_________________\nParent Signature', description: 'Guardian acknowledgement' },
];

/**
 * Retrieves all user-created custom keys from localStorage
 */
export function getCustomUserKeys(): CustomKeyDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEYS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load custom user keys', e);
  }
  return [];
}

/**
 * Saves a new custom key
 */
export function saveCustomUserKey(item: { key: string; label: string; defaultValue?: string; category?: KeyCategory }): CustomKeyDefinition[] {
  const cleanKey = item.key
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');
  
  if (!cleanKey) return getCustomUserKeys();

  const current = getCustomUserKeys();
  const existingIdx = current.findIndex((k) => k.key === cleanKey);
  const updatedItem: CustomKeyDefinition = {
    key: cleanKey,
    label: item.label || cleanKey,
    defaultValue: item.defaultValue || '',
    category: item.category || 'custom',
    createdAt: new Date().toISOString(),
  };

  let nextList: CustomKeyDefinition[];
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = updatedItem;
  } else {
    nextList = [...current, updatedItem];
  }

  try {
    localStorage.setItem(CUSTOM_KEYS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.error('Failed to save custom key', e);
  }

  return nextList;
}

/**
 * Deletes a custom key
 */
export function deleteCustomUserKey(key: string): CustomKeyDefinition[] {
  const current = getCustomUserKeys();
  const nextList = current.filter((k) => k.key !== key);
  try {
    localStorage.setItem(CUSTOM_KEYS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.error('Failed to delete custom key', e);
  }
  return nextList;
}

/**
 * Returns all active keys (Universal Standard + Custom User Keys)
 */
export function getAllTaxonomyKeys(): KeyTaxonomyItem[] {
  const customList = getCustomUserKeys().map((c) => ({
    key: c.key,
    label: c.label,
    category: (c.category || 'custom') as KeyCategory,
    example: c.defaultValue || '[Custom Value]',
    description: 'Custom institution-defined key',
    isCustom: true,
  }));

  return [...UNIVERSAL_KEY_TAXONOMY, ...customList];
}

/**
 * Formats a key identifier into template placeholder format: `{{key}}`
 */
export function formatPlaceholderToken(key: string): string {
  const clean = key.replace(/[{}]/g, '').trim();
  return `{{${clean}}}`;
}
