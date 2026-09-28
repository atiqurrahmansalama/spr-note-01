/**
 * Extensible ERP Data Provider & Universal Schema Registry
 *
 * Provides deep object normalization, dot notation resolution, synonym matching,
 * and formula calculations (sum, avg, count, max, min) for DocLab dynamic templates.
 *
 * Architectural Invariants:
 * 1. Independent of pagination and layout logic.
 * 2. 100% extensible for future ERP modules without engine refactoring.
 * 3. Handles nested objects, lists, and multi-lingual naming gracefully.
 */

import { ErpModuleMetadata } from './types';
import {
  SAMPLE_INSTITUTION,
  SAMPLE_STUDENT_ROSTER,
  SAMPLE_EXAM_MARKSHEET,
  SAMPLE_FEE_VOUCHER,
  SAMPLE_SALARY_SLIP,
  SAMPLE_HIFZ_PROGRESS,
  SAMPLE_INSTITUTIONAL_NOTICE,
} from './institutionalSampleData';

export class ErpDataProvider {
  private static registeredModules: Map<string, ErpModuleMetadata> = new Map();

  /**
   * Registers a new or custom ERP module schema
   */
  public static registerModule(metadata: ErpModuleMetadata): void {
    this.registeredModules.set(metadata.moduleId.toLowerCase(), metadata);
  }

  /**
   * Retrieves registered ERP module metadata
   */
  public static getModule(moduleId: string): ErpModuleMetadata | undefined {
    return this.registeredModules.get(moduleId.toLowerCase());
  }

  /**
   * Returns all registered ERP modules
   */
  public static getAllModules(): ErpModuleMetadata[] {
    return Array.from(this.registeredModules.values());
  }

  /**
   * Deeply normalizes an ERP data record into a flat, fast-lookup map with all key variants:
   * - Dot notation: `student.name`, `institution.address`
   * - Snake_case: `student_name`, `institution_address`
   * - CamelCase: `studentName`, `institutionAddress`
   * - Space-separated: `student name`, `institution address`
   * - Lowercase & alphanumeric stripped keys: `studentname`, `institutionaddress`
   */
  public static buildLookupContext(data: Record<string, any>): Map<string, any> {
    const lookup = new Map<string, any>();
    if (!data || typeof data !== 'object') return lookup;

    const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

    const insertVariants = (prefix: string, value: any) => {
      if (value === undefined || value === null) return;

      const raw = prefix.trim();
      const lower = raw.toLowerCase();
      const norm = normalizeKey(raw);

      lookup.set(raw, value);
      lookup.set(lower, value);
      if (norm) lookup.set(norm, value);

      // Snake case
      const snake = raw.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      if (snake && snake !== lower) {
        lookup.set(snake, value);
        lookup.set(snake.replace(/_/g, ' '), value);
      }

      // Camel case
      const camel = raw.replace(/_([a-z0-9])/gi, (_, letter) => letter.toUpperCase());
      if (camel && camel !== raw) {
        lookup.set(camel, value);
      }

      // Space separated
      const space = raw.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      if (space) {
        lookup.set(space, value);
      }
    };

    const traverse = (obj: Record<string, any>, currentPath: string = '') => {
      Object.entries(obj).forEach(([key, val]) => {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        const underscorePath = currentPath ? `${currentPath}_${key}` : key;

        insertVariants(fullPath, val);
        insertVariants(underscorePath, val);
        insertVariants(key, val);

        if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
          traverse(val, fullPath);
        }
      });
    };

    traverse(data);

    // Also compute aggregate summaries for any arrays found
    Object.entries(data).forEach(([key, val]) => {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const sample = val[0];
        Object.keys(sample).forEach((fieldKey) => {
          // Check if field is numeric
          const numbers = val
            .map((item) => parseFloat(item[fieldKey]))
            .filter((n) => !isNaN(n));

          if (numbers.length > 0) {
            const sum = numbers.reduce((acc, curr) => acc + curr, 0);
            const avg = sum / numbers.length;
            const max = Math.max(...numbers);
            const min = Math.min(...numbers);

            insertVariants(`sum_${key}_${fieldKey}`, sum);
            insertVariants(`avg_${key}_${fieldKey}`, parseFloat(avg.toFixed(2)));
            insertVariants(`max_${key}_${fieldKey}`, max);
            insertVariants(`min_${key}_${fieldKey}`, min);
          }
        });

        insertVariants(`total_${key}_count`, val.length);
        insertVariants(`${key}_count`, val.length);
      }
    });

    return lookup;
  }

  /**
   * Resolves a nested expression or token from a data record using dot notation, array indexing, or flat lookup
   */
  public static getValue(data: Record<string, any>, path: string, fallback: any = undefined): any {
    if (!data || !path) return fallback;

    // 1. Direct key match
    if (data[path] !== undefined && data[path] !== null) {
      return data[path];
    }

    // 2. Dot notation traversal: `student.guardian.phone` or `subjects[0].obtainedMarks`
    const cleanPath = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
    const parts = cleanPath.split('.');
    let current: any = data;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return fallback;
      }
      current = current[part];
    }

    return current !== undefined && current !== null ? current : fallback;
  }
}

// Register standard ERP modules on module load
ErpDataProvider.registerModule({
  moduleId: 'student_profile',
  moduleName: 'Student Information & Enrolment',
  category: 'Academic',
  description: 'Student biodata, admissions, guardian contacts, roll slips, and identity verification.',
  availablePlaceholders: [
    { key: 'student_name', label: 'Student Full Name', category: 'student', sampleValue: 'Muhammad Abdullah' },
    { key: 'roll_number', label: 'Class Roll Number', category: 'student', sampleValue: '1' },
    { key: 'student_id', label: 'Student ID / Enrolment No', category: 'student', sampleValue: 'STD-2026-001' },
    { key: 'class_name', label: 'Class / Grade Level', category: 'academic', sampleValue: 'Class 10 (Dakhil)' },
    { key: 'section_name', label: 'Section / Stream', category: 'academic', sampleValue: 'A (Abu Bakr)' },
    { key: 'father_name', label: 'Father Name', category: 'guardian', sampleValue: 'Muhammad Abdur Rahim' },
    { key: 'mother_name', label: 'Mother Name', category: 'guardian', sampleValue: 'Amina Begum' },
    { key: 'guardian_phone', label: 'Guardian Emergency Contact', category: 'guardian', sampleValue: '+880 1711-112233' },
    { key: 'blood_group', label: 'Blood Group', category: 'student', sampleValue: 'A+' },
  ],
  sampleDataset: SAMPLE_STUDENT_ROSTER[0],
  supportedScopes: ['student_id_card', 'character_certificate', 'general_document'],
});

ErpDataProvider.registerModule({
  moduleId: 'examination_results',
  moduleName: 'Examinations, Evaluation & Marksheets',
  category: 'Examination',
  description: 'Exam marksheets, subject routines, GPA calculations, grading matrices, and merit standings.',
  availablePlaceholders: [
    { key: 'exam_name', label: 'Examination Title', category: 'exam', sampleValue: 'Annual Final Examination 2026' },
    { key: 'gpa', label: 'Grade Point Average (GPA)', category: 'exam', sampleValue: '5.00' },
    { key: 'letter_grade', label: 'Overall Letter Grade', category: 'exam', sampleValue: 'A+' },
    { key: 'total_obtained_marks', label: 'Total Obtained Marks', category: 'exam', sampleValue: '678' },
    { key: 'merit_position', label: 'Class Merit Standing', category: 'exam', sampleValue: '1' },
    { key: 'result_status', label: 'Evaluation Status (Passed/Failed)', category: 'exam', sampleValue: 'Passed' },
  ],
  sampleDataset: SAMPLE_EXAM_MARKSHEET,
  supportedScopes: ['marksheet_transcript', 'tabulation_sheet', 'exam_admit_card', 'exam_routine'],
});

ErpDataProvider.registerModule({
  moduleId: 'fee_accounts',
  moduleName: 'Financial Accounts & Billing',
  category: 'Financial',
  description: 'Student fee vouchers, monthly billing slips, payment receipts, and collection registers.',
  availablePlaceholders: [
    { key: 'voucher_number', label: 'Voucher / Invoice Number', category: 'finance', sampleValue: 'INV-2026-09452' },
    { key: 'invoice_date', label: 'Billing / Issue Date', category: 'finance', sampleValue: '2026-09-01' },
    { key: 'due_date', label: 'Payment Due Date', category: 'finance', sampleValue: '2026-09-15' },
    { key: 'grand_total', label: 'Grand Total Amount', category: 'finance', sampleValue: '7600' },
    { key: 'paid_amount', label: 'Total Paid Amount', category: 'finance', sampleValue: '7600' },
    { key: 'due_amount', label: 'Outstanding Balance', category: 'finance', sampleValue: '0' },
    { key: 'payment_status', label: 'Payment Status', category: 'finance', sampleValue: 'Paid' },
  ],
  sampleDataset: SAMPLE_FEE_VOUCHER,
  supportedScopes: ['fee_voucher', 'general_document'],
});

ErpDataProvider.registerModule({
  moduleId: 'staff_payroll',
  moduleName: 'Staff & Human Resources Payroll',
  category: 'Human Resources',
  description: 'Employee monthly salary slips, earnings, deductions, provident fund, and net pay sheets.',
  availablePlaceholders: [
    { key: 'slip_number', label: 'Payslip Reference Number', category: 'staff', sampleValue: 'PAY-2026-09-014' },
    { key: 'employee_name', label: 'Employee Full Name', category: 'staff', sampleValue: 'Mawlana Hafizur Rahman' },
    { key: 'designation', label: 'Designation / Title', category: 'staff', sampleValue: 'Senior Teacher' },
    { key: 'department', label: 'Academic Department', category: 'staff', sampleValue: 'Department of Quranic Studies' },
    { key: 'basic_salary', label: 'Basic Salary Amount', category: 'staff', sampleValue: '35000' },
    { key: 'gross_salary', label: 'Gross Salary Amount', category: 'staff', sampleValue: '60000' },
    { key: 'total_deduction', label: 'Total Deductions', category: 'staff', sampleValue: '5200' },
    { key: 'net_payable', label: 'Net Payable Amount', category: 'staff', sampleValue: '54800' },
  ],
  sampleDataset: SAMPLE_SALARY_SLIP,
  supportedScopes: ['salary_slip', 'general_document'],
});

ErpDataProvider.registerModule({
  moduleId: 'hifz_progress',
  moduleName: 'Quran Hifz & Daily Memorization',
  category: 'Academic',
  description: 'Daily Quran memorization records, Sabaq, Sabqi, Manzil, mistakes, and voice quality.',
  availablePlaceholders: [
    { key: 'juz_number', label: 'Current Para / Juz', category: 'hifz', sampleValue: '28' },
    { key: 'current_surah', label: 'Current Surah Title', category: 'hifz', sampleValue: 'Surah Al-Mujadila' },
    { key: 'sabaq_pages', label: 'Today Sabaq Pages', category: 'hifz', sampleValue: 'Pages 542 - 544' },
    { key: 'sabqi_pages', label: 'Recent Revision (Sabqi)', category: 'hifz', sampleValue: 'Quarter Juz' },
    { key: 'manzil_pages', label: 'Master Revision (Manzil)', category: 'hifz', sampleValue: 'Juz 1 to 5' },
    { key: 'mistakes_count', label: 'Recorded Mistakes', category: 'hifz', sampleValue: '0' },
    { key: 'stuck_count', label: 'Stuck Points (Luqma)', category: 'hifz', sampleValue: '1' },
  ],
  sampleDataset: SAMPLE_HIFZ_PROGRESS,
  supportedScopes: ['hifz_daily_report', 'general_document'],
});

ErpDataProvider.registerModule({
  moduleId: 'institutional_notice',
  moduleName: 'Official Notices, Memoranda & Circulars',
  category: 'General',
  description: 'Official announcements, event notices, holiday circulars, and executive directives.',
  availablePlaceholders: [
    { key: 'notice_number', label: 'Notice Serial Number', category: 'system', sampleValue: 'NOT-2026-092' },
    { key: 'subject', label: 'Notice Subject Line', category: 'general', sampleValue: 'Commencement of Examination' },
    { key: 'issue_date', label: 'Date of Notice Issuance', category: 'system', sampleValue: '2026-09-29' },
    { key: 'target_audience', label: 'Target Audience Recipient', category: 'general', sampleValue: 'All Students & Guardians' },
    { key: 'signed_by', label: 'Authorized Signatory', category: 'signatures', sampleValue: 'Principal & Head of Committee' },
  ],
  sampleDataset: SAMPLE_INSTITUTIONAL_NOTICE,
  supportedScopes: ['general_document'],
});
