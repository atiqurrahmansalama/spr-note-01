/**
 * Strongly Typed ERP Document Data Schemas & Template Merge Interfaces
 *
 * Defines the unified data contracts for all institutional ERP modules:
 * - Institution & Branding Metadata
 * - Student Profiles & Enrolment
 * - Examination, Marksheets & Tabulation Ledgers
 * - Financial Vouchers, Fee Slips & Billing
 * - Human Resources, Staff & Payroll
 * - Quran Hifz Progress & Academics
 * - General Documents, Circulars & Notices
 * - Future ERP Module Extension Registry
 *
 * Architectural Invariants:
 * 1. Independent of pagination and physical paper geometry.
 * 2. Pure data contract matching the Canonical Document AST.
 * 3. 100% interoperable with TokenResolver, TemplateAdapter, and PaginationEngine.
 */

import { CanonicalDocument, Mark } from '../types';

/**
 * Institution & Campus Branding Schema
 */
export interface InstitutionData {
  name: string;
  nameBangla?: string;
  nameArabic?: string;
  shortName?: string;
  code?: string;
  eiin?: string;
  logo?: string;
  watermarkLogo?: string;
  address: string;
  campusName?: string;
  branchName?: string;
  phone: string;
  email?: string;
  website?: string;
  establishedYear?: string | number;
  principalName?: string;
  principalDesignation?: string;
  principalSignatureUrl?: string;
  examControllerName?: string;
  examControllerSignatureUrl?: string;
  officialSealUrl?: string;
  tagline?: string;
  academicYear?: string | number;
  session?: string;
  currentDate?: string;
  [key: string]: any;
}

/**
 * Student Profile Schema
 */
export interface StudentProfileData {
  id?: string;
  studentId: string;
  name: string;
  nameBangla?: string;
  nameArabic?: string;
  rollNumber: string | number;
  registrationNumber?: string;
  className: string;
  sectionName?: string;
  group?: string;
  shift?: string;
  department?: string;
  session?: string;
  academicYear?: string | number;
  gender?: 'male' | 'female' | 'other' | string;
  dob?: string;
  bloodGroup?: string;
  photoUrl?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  address?: string;
  presentAddress?: string;
  permanentAddress?: string;
  admissionDate?: string;
  hallName?: string;
  seatNumber?: string | number;
  qrVerificationUrl?: string;
  [key: string]: any;
}

/**
 * Subject Marks & Grade Item Schema
 */
export interface SubjectMarkItem {
  id?: string;
  subjectCode?: string;
  subjectName: string;
  subjectNameBangla?: string;
  subjectType?: 'compulsory' | 'elective' | 'optional' | string;
  fullMarks?: number;
  cqMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
  caMarks?: number; // Continuous Assessment
  obtainedMarks: number;
  highestMarks?: number;
  letterGrade: string;
  gradePoint: number;
  isPassed?: boolean;
  examDate?: string;
  examTime?: string;
  roomNumber?: string;
  teacherRemarks?: string;
  [key: string]: any;
}

/**
 * Grading Scale Matrix Rule
 */
export interface GradeScaleRule {
  grade: string;
  gpa: number;
  minMarks: number;
  maxMarks: number;
  remarks: string;
}

/**
 * Examination Evaluation & Marksheet Schema
 */
export interface ExamReportData {
  examId?: string;
  examName: string;
  examType?: string;
  academicYear: string | number;
  session?: string;
  term?: string;
  publishDate?: string;
  student: StudentProfileData;
  institution?: InstitutionData;
  subjects: SubjectMarkItem[];
  totalFullMarks?: number;
  totalObtainedMarks: number;
  averageMarks?: number;
  percentage?: number;
  gpa: number;
  letterGrade: string;
  meritPosition?: number | string;
  totalStudentsInClass?: number;
  resultStatus: 'Passed' | 'Failed' | 'Promoted' | 'Withheld' | string;
  workingDays?: number;
  presentDays?: number;
  absentDays?: number;
  attendancePercentage?: number;
  generalRemarks?: string;
  gradingScale?: GradeScaleRule[];
  classTeacherRemarks?: string;
  principalRemarks?: string;
  [key: string]: any;
}

/**
 * Financial Line Item Schema (Tuition, Admission, Exam, Transport, etc.)
 */
export interface FeeLineItem {
  id?: string;
  sl?: number;
  feeHead: string;
  feeHeadBangla?: string;
  month?: string;
  amount: number;
  discount?: number;
  fine?: number;
  netAmount: number;
  paidAmount?: number;
  dueAmount?: number;
  status?: 'Paid' | 'Unpaid' | 'Partial' | string;
  [key: string]: any;
}

/**
 * Fee Voucher / Billing Invoice Schema
 */
export interface FeeVoucherData {
  voucherId?: string;
  voucherNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial' | 'Overdue' | string;
  paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Bank' | 'Online' | string;
  transactionId?: string;
  student: StudentProfileData;
  institution?: InstitutionData;
  items: FeeLineItem[];
  subtotal: number;
  totalDiscount?: number;
  totalFine?: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  inWords?: string;
  copyType?: 'Student Copy' | 'Bank Copy' | 'Accounts Copy' | 'Office Copy' | string;
  cashierName?: string;
  cashierSignatureUrl?: string;
  [key: string]: any;
}

/**
 * Payroll Earning / Deduction Item Schema
 */
export interface PayrollItem {
  id?: string;
  title: string;
  category: 'earning' | 'deduction';
  amount: number;
  [key: string]: any;
}

/**
 * Staff Salary Slip / Payroll Schema
 */
export interface SalarySlipData {
  slipNumber: string;
  month: string;
  year: number | string;
  paymentDate: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  joiningDate?: string;
  bankName?: string;
  bankAccountNumber?: string;
  institution?: InstitutionData;
  earnings: PayrollItem[];
  deductions: PayrollItem[];
  basicSalary: number;
  grossSalary: number;
  totalDeduction: number;
  netPayable: number;
  netPayableInWords?: string;
  paymentStatus: 'Paid' | 'Pending' | string;
  preparedBy?: string;
  approvedBy?: string;
  [key: string]: any;
}

/**
 * Quran & Hifz Daily Progress Schema
 */
export interface HifzProgressData {
  recordDate: string;
  student: StudentProfileData;
  institution?: InstitutionData;
  juzNumber: number | string;
  currentSurah: string;
  sabaqPages: string | number;
  sabqiPages: string | number;
  manzilPages: string | number;
  mistakesCount: number;
  stuckCount: number;
  voiceTilaawatQuality?: 'Excellent' | 'Good' | 'Fair' | string;
  attendanceStatus: 'Present' | 'Absent' | 'Late' | string;
  teacherRemarks?: string;
  [key: string]: any;
}

/**
 * Institutional Notice / Circular Schema
 */
export interface InstitutionalNoticeData {
  noticeNumber: string;
  issueDate: string;
  subject: string;
  targetAudience: string;
  bodyHtml?: string;
  bodyText?: string;
  institution?: InstitutionData;
  signedBy: string;
  designation: string;
  referenceNumber?: string;
  attachmentCount?: number;
  [key: string]: any;
}

/**
 * Loop Iteration Context
 */
export interface LoopScopeContext {
  '@index': number;        // 1-based index (1, 2, 3...)
  '@index0': number;       // 0-based index (0, 1, 2...)
  '@first': boolean;       // true if first item
  '@last': boolean;        // true if last item
  '@total': number;        // total items count
  '@key'?: string;         // key name when iterating over object
  sl?: number;             // Synonym for @index
  serial?: number;         // Synonym for @index
  index?: number;          // Synonym for @index
  no?: number;             // Synonym for @index
  parent?: Record<string, any>;
  [key: string]: any;
}

/**
 * Custom Formatting Filter Handler
 */
export type CustomFilterHandler = (value: any, args?: string, context?: Record<string, any>) => string;

/**
 * Custom Directive Handler
 */
export type CustomDirectiveHandler = (value: any, options?: Record<string, any>, context?: Record<string, any>) => string;

/**
 * Options for Template Merging Engine
 */
export interface TemplateMergeOptions {
  preserveUnresolvedTokens?: boolean;
  unresolvedTokenFallback?: string;
  customFilters?: Record<string, CustomFilterHandler>;
  customDirectives?: Record<string, CustomDirectiveHandler>;
  numeralSystem?: 'latn' | 'beng' | 'arab';
  onWarning?: (warning: string) => void;
}

/**
 * Options for Batch Document Merging
 */
export interface BatchMergeOptions extends TemplateMergeOptions {
  insertPageBreakBetweenRecords?: boolean;
  sectionTitleField?: string;
  documentTitlePrefix?: string;
  inheritDocumentStyles?: boolean;
}

/**
 * ERP Module Metadata for Extensible Dynamic Registry
 */
export interface ErpModuleMetadata {
  moduleId: string;
  moduleName: string;
  category: 'Academic' | 'Examination' | 'Financial' | 'Human Resources' | 'General' | string;
  description: string;
  availablePlaceholders: Array<{
    key: string;
    label: string;
    category?: string;
    sampleValue?: any;
    description?: string;
  }>;
  sampleDataset: Record<string, any>;
  supportedScopes: string[];
}
