import { KeyTaxonomyItem } from '@/components/print/keyLibrary/types';
import { examStore } from '@/stores/examStore';
import { StudentResult, SubjectMark, GradingSystem } from '../types';
import {
  computeTotalFullMarks,
  computeTotalObtainedMarks,
  formatRankOrdinal,
} from './transcriptUtils';

/**
 * Generates slot taxonomy keys for fixed subject cells (1 to 15)
 */
function generateSubjectSlotTaxonomyKeys(maxSlots = 15): KeyTaxonomyItem[] {
  const items: KeyTaxonomyItem[] = [];
  for (let i = 1; i <= maxSlots; i++) {
    items.push(
      {
        key: `subject_${i}_name`,
        label: `Subject ${i} Name`,
        category: 'subjects',
        example: i === 1 ? 'Quran Majid & Tajweed' : i === 2 ? 'Arabic Language' : `Subject ${i}`,
        description: `Name of subject in slot ${i}`,
      },
      {
        key: `subject_${i}_code`,
        label: `Subject ${i} Code`,
        category: 'subjects',
        example: `${100 + i}`,
        description: `Subject code in slot ${i}`,
      },
      {
        key: `subject_${i}_full`,
        label: `Subject ${i} Full Marks`,
        category: 'subjects',
        example: '100',
        description: `Full possible marks for subject ${i}`,
      },
      {
        key: `subject_${i}_pass`,
        label: `Subject ${i} Pass Marks`,
        category: 'subjects',
        example: '33',
        description: `Pass threshold for subject ${i}`,
      },
      {
        key: `subject_${i}_highest`,
        label: `Subject ${i} Highest Marks`,
        category: 'subjects',
        example: '98',
        description: `Highest mark obtained in class for subject ${i}`,
      },
      {
        key: `subject_${i}_cq`,
        label: `Subject ${i} CQ / Written Marks`,
        category: 'subjects',
        example: '62',
        description: `Written or creative mark for subject ${i}`,
      },
      {
        key: `subject_${i}_mcq`,
        label: `Subject ${i} MCQ Marks`,
        category: 'subjects',
        example: '28',
        description: `Multiple choice mark for subject ${i}`,
      },
      {
        key: `subject_${i}_practical`,
        label: `Subject ${i} Practical Marks`,
        category: 'subjects',
        example: '—',
        description: `Practical lab mark for subject ${i}`,
      },
      {
        key: `subject_${i}_ca`,
        label: `Subject ${i} Continuous Assessment`,
        category: 'subjects',
        example: '—',
        description: `Continuous assessment mark for subject ${i}`,
      },
      {
        key: `subject_${i}_obtained`,
        label: `Subject ${i} Obtained Marks`,
        category: 'subjects',
        example: '90',
        description: `Total marks obtained in subject ${i}`,
      },
      {
        key: `subject_${i}_percentage`,
        label: `Subject ${i} Percentage`,
        category: 'subjects',
        example: '90.00%',
        description: `Calculated percentage for subject ${i}`,
      },
      {
        key: `subject_${i}_gpa`,
        label: `Subject ${i} GPA / Grade Point`,
        category: 'subjects',
        example: '5.00',
        description: `Grade point score for subject ${i}`,
      },
      {
        key: `subject_${i}_grade`,
        label: `Subject ${i} Letter Grade`,
        category: 'subjects',
        example: 'A+',
        description: `Letter grade for subject ${i}`,
      },
      {
        key: `subject_${i}_status`,
        label: `Subject ${i} Status (PASSED/FAILED)`,
        category: 'subjects',
        example: 'PASSED',
        description: `Passing status for subject ${i}`,
      }
    );
  }
  return items;
}

/**
 * Universal Key Taxonomy Items for Student MarkSheet & Academic Transcript
 * Consumed by Print Studio's KeyPaletteExplorer, Key Insertions, and Word (.docx) Engine.
 */
export const STUDENT_MARKSHEET_TAXONOMY_KEYS: KeyTaxonomyItem[] = [
  // ─── Student Profile & Identification ──────────────────────────────
  {
    key: 'student_name',
    label: 'Student Full Name',
    category: 'student',
    example: 'Abdullah Al Mamun',
    description: 'Full official name of the student',
  },
  {
    key: 'student_name_bn',
    label: 'Student Name (Bengali)',
    category: 'student',
    example: 'আব্দুল্লাহ আল মামুন',
    description: 'Student name in Bengali script',
  },
  {
    key: 'student_name_ar',
    label: 'Student Name (Arabic)',
    category: 'student',
    example: 'عبد الله المأمون',
    description: 'Student name in Arabic script',
  },
  {
    key: 'roll_number',
    label: 'Roll Number',
    category: 'student',
    example: '01',
    description: 'Assigned classroom roll number',
  },
  {
    key: 'student_id',
    label: 'Student ID / Reg No',
    category: 'student',
    example: 'STD-2026-001',
    description: 'Unique student identifier code',
  },
  {
    key: 'reg_no',
    label: 'Registration Number',
    category: 'student',
    example: 'REG-89201',
    description: 'Board or institutional registration number',
  },
  {
    key: 'admission_no',
    label: 'Admission Number',
    category: 'student',
    example: 'ADM-2026-108',
    description: 'Initial student admission form number',
  },
  {
    key: 'father_name',
    label: 'Father Name',
    category: 'student',
    example: 'Mohammad Ali',
    description: 'Full name of student father',
  },
  {
    key: 'father_name_bn',
    label: 'Father Name (Bengali)',
    category: 'student',
    example: 'মোহাম্মদ আলী',
    description: 'Father name in Bengali script',
  },
  {
    key: 'mother_name',
    label: 'Mother Name',
    category: 'student',
    example: 'Fatema Begum',
    description: 'Full name of student mother',
  },
  {
    key: 'mother_name_bn',
    label: 'Mother Name (Bengali)',
    category: 'student',
    example: 'ফাতেমা বেগম',
    description: 'Mother name in Bengali script',
  },
  {
    key: 'guardian_name',
    label: 'Legal Guardian Name',
    category: 'student',
    example: 'Mohammad Ali',
    description: 'Designated legal guardian full name',
  },
  {
    key: 'guardian_phone',
    label: 'Guardian Contact Phone',
    category: 'student',
    example: '+880 1712-345678',
    description: 'Primary mobile number of parent/guardian',
  },
  {
    key: 'dob',
    label: 'Date of Birth',
    category: 'student',
    example: '12-05-2010',
    description: 'Birth date of student',
  },
  {
    key: 'gender',
    label: 'Gender',
    category: 'student',
    example: 'Male',
    description: 'Gender (Male / Female)',
  },
  {
    key: 'blood_group',
    label: 'Blood Group',
    category: 'student',
    example: 'B+',
    description: 'Medical blood group',
  },
  {
    key: 'student_photo',
    label: 'Student Photograph',
    category: 'student',
    example: '[Student Photo]',
    description: 'Passport-sized profile photograph embed',
  },
  {
    key: 'student_address',
    label: 'Residential Address',
    category: 'student',
    example: 'Dhaka, Bangladesh',
    description: 'Student home/present address',
  },

  // ─── Academic & Classroom ──────────────────────────────────────────
  {
    key: 'class_name',
    label: 'Class / Grade Name',
    category: 'academic',
    example: 'Class 10',
    description: 'Academic class or grade level',
  },
  {
    key: 'class_name_bn',
    label: 'Class Name (Bengali)',
    category: 'academic',
    example: 'দশম শ্রেণি',
    description: 'Academic class in Bengali',
  },
  {
    key: 'section_name',
    label: 'Section / Branch',
    category: 'academic',
    example: 'Section A',
    description: 'Assigned class section or branch division',
  },
  {
    key: 'academic_session',
    label: 'Academic Session / Year',
    category: 'academic',
    example: '2025-2026',
    description: 'Academic calendar session or fiscal year',
  },
  {
    key: 'academic_year',
    label: 'Academic Year',
    category: 'academic',
    example: '2026',
    description: 'Academic year',
  },
  {
    key: 'group_name',
    label: 'Group / Department',
    category: 'academic',
    example: 'Science / General',
    description: 'Academic department or study stream',
  },
  {
    key: 'shift',
    label: 'Class Shift',
    category: 'academic',
    example: 'Morning',
    description: 'Shift timing (Morning / Day)',
  },
  {
    key: 'medium',
    label: 'Medium / Version',
    category: 'academic',
    example: 'Bangla Medium',
    description: 'Instruction medium (Bangla / English / Arabic)',
  },
  {
    key: 'class_teacher_name',
    label: 'Class Teacher Name',
    category: 'academic',
    example: 'Ustadh Mahmud Hasan',
    description: 'Assigned class teacher or homeroom master',
  },

  // ─── Examination & Performance Scores ──────────────────────────────
  {
    key: 'exam_name',
    label: 'Examination Title',
    category: 'exam',
    example: 'Annual Examination 2026',
    description: 'Official title of the examination',
  },
  {
    key: 'exam_date',
    label: 'Examination Date',
    category: 'exam',
    example: '20-11-2026',
    description: 'Date or period of the examination',
  },
  {
    key: 'exam_term',
    label: 'Examination Term',
    category: 'exam',
    example: 'Final Term',
    description: 'Semester or term designation',
  },
  {
    key: 'total_students',
    label: 'Total Students in Class',
    category: 'exam',
    example: '45',
    description: 'Total examinees enrolled in this class',
  },
  {
    key: 'total_subjects',
    label: 'Total Subjects Count',
    category: 'exam',
    example: '7',
    description: 'Total number of subjects evaluated',
  },
  {
    key: 'total_marks',
    label: 'Total Full Marks',
    category: 'exam',
    example: '700',
    description: 'Aggregate full possible marks across all subjects',
  },
  {
    key: 'total_full_marks',
    label: 'Total Full Marks (Alias)',
    category: 'exam',
    example: '700',
    description: 'Direct alias for total full marks',
  },
  {
    key: 'obtained_marks',
    label: 'Total Obtained Marks',
    category: 'exam',
    example: '642',
    description: 'Grand total marks secured by the student',
  },
  {
    key: 'total_obtained_marks',
    label: 'Total Obtained Marks (Alias)',
    category: 'exam',
    example: '642',
    description: 'Direct alias for total obtained marks',
  },
  {
    key: 'average_marks',
    label: 'Average Marks',
    category: 'exam',
    example: '91.71',
    description: 'Average marks obtained per subject',
  },
  {
    key: 'avg_marks',
    label: 'Average Marks (Alias)',
    category: 'exam',
    example: '91.71',
    description: 'Direct shorthand alias for average marks',
  },
  {
    key: 'percentage',
    label: 'Overall Percentage',
    category: 'exam',
    example: '91.71%',
    description: 'Calculated aggregate percentage score',
  },
  {
    key: 'gpa',
    label: 'GPA Score',
    category: 'exam',
    example: '5.00',
    description: 'Grade Point Average derived from grading scale',
  },
  {
    key: 'overall_gpa',
    label: 'Overall GPA (Alias)',
    category: 'exam',
    example: '5.00',
    description: 'Direct alias for student overall GPA score',
  },
  {
    key: 'grade',
    label: 'Letter Grade',
    category: 'exam',
    example: 'A+',
    description: 'Consolidated final academic letter grade',
  },
  {
    key: 'letter_grade',
    label: 'Letter Grade (Alias)',
    category: 'exam',
    example: 'A+',
    description: 'Direct alias for student final letter grade',
  },
  {
    key: 'division',
    label: 'Division / Standing',
    category: 'exam',
    example: 'First Division (Mumtaz)',
    description: 'Islamic/National academic division standing',
  },
  {
    key: 'merit_position',
    label: 'Merit Position / Rank',
    category: 'exam',
    example: '1st',
    description: 'Class rank with ordinal suffix (e.g. 1st, 2nd, 3rd)',
  },
  {
    key: 'merit_status',
    label: 'Merit & Result Status',
    category: 'exam',
    example: '1st (Mumtaz) • PASSED',
    description: 'Comprehensive combination of merit standing and result status',
  },
  {
    key: 'class_rank',
    label: 'Class Rank Number',
    category: 'exam',
    example: '1',
    description: 'Numerical class merit standing number',
  },
  {
    key: 'section_rank',
    label: 'Section Rank Number',
    category: 'exam',
    example: '1',
    description: 'Numerical section merit standing number',
  },
  {
    key: 'result_status',
    label: 'Result Status (PASSED / FAILED)',
    category: 'exam',
    example: 'PASSED',
    description: 'Overall pass/fail qualification status',
  },
  {
    key: 'result_summary',
    label: 'Full Result Summary',
    category: 'exam',
    example: 'PASSED • GPA: 5.00 • Grade: A+ • 1st Position',
    description: 'One-line complete academic result summary string',
  },
  {
    key: 'highest_marks',
    label: 'Class Highest Total Marks',
    category: 'exam',
    example: '665',
    description: 'Highest total marks scored in class/exam',
  },
  {
    key: 'highest_gpa',
    label: 'Class Highest GPA',
    category: 'exam',
    example: '5.00',
    description: 'Highest GPA achieved among all students',
  },
  {
    key: 'highest_percentage',
    label: 'Class Highest Percentage',
    category: 'exam',
    example: '95.00%',
    description: 'Top aggregate score percentage in class',
  },
  {
    key: 'highest_grade',
    label: 'Class Highest Letter Grade',
    category: 'exam',
    example: 'A+',
    description: 'Highest grade achieved in class',
  },
  {
    key: 'passed_subjects_count',
    label: 'Passed Subjects Count',
    category: 'exam',
    example: '7',
    description: 'Total number of subjects passed',
  },
  {
    key: 'failed_subjects_count',
    label: 'Failed Subjects Count',
    category: 'exam',
    example: '0',
    description: 'Total number of subjects failed',
  },
  {
    key: 'attendance_working_days',
    label: 'Total Working Days',
    category: 'exam',
    example: '120',
    description: 'Total academic sessions conducted',
  },
  {
    key: 'attendance_present_days',
    label: 'Total Present Days',
    category: 'exam',
    example: '118',
    description: 'Total days attended by student',
  },
  {
    key: 'attendance_percentage',
    label: 'Attendance Percentage',
    category: 'exam',
    example: '98.33%',
    description: 'Calculated attendance rate',
  },
  {
    key: 'teacher_remarks',
    label: 'Class Teacher Remarks',
    category: 'exam',
    example: 'Excellent academic performance and high moral discipline.',
    description: 'Evaluative remarks from class teacher',
  },
  {
    key: 'conduct_remarks',
    label: 'Student Conduct Remarks',
    category: 'exam',
    example: 'Satisfactory / Exemplary',
    description: 'Moral conduct and character assessment',
  },

  // ─── Tabular Subject Column Keys (Repeating Rows / Loop) ───────────
  {
    key: 'subject',
    label: 'Subject Name (Table Column)',
    category: 'subjects',
    example: 'Quran Majid & Tajweed',
    description: 'Direct subject title placeholder for table row',
  },
  {
    key: 'subject_name',
    label: 'Subject Full Name (Table Column)',
    category: 'subjects',
    example: 'Quran Majid & Tajweed',
    description: 'Individual subject name in table row',
  },
  {
    key: 'subject_code',
    label: 'Subject Code (Table Column)',
    category: 'subjects',
    example: '101',
    description: 'Curricular subject identifier code',
  },
  {
    key: 'full_marks',
    label: 'Subject Full Marks (Table Column)',
    category: 'subjects',
    example: '100',
    description: 'Maximum full marks for the subject',
  },
  {
    key: 'pass_marks',
    label: 'Subject Pass Marks (Table Column)',
    category: 'subjects',
    example: '33',
    description: 'Minimum required pass marks for the subject',
  },
  {
    key: 'highest_marks',
    label: 'Subject Highest Marks (Table Column)',
    category: 'subjects',
    example: '98',
    description: 'Highest marks scored in class for this subject',
  },
  {
    key: 'cq_marks',
    label: 'Written / CQ Marks (Table Column)',
    category: 'subjects',
    example: '62',
    description: 'Written/Creative component score',
  },
  {
    key: 'mcq_marks',
    label: 'MCQ Marks (Table Column)',
    category: 'subjects',
    example: '28',
    description: 'Multiple choice component score',
  },
  {
    key: 'practical_marks',
    label: 'Practical Marks (Table Column)',
    category: 'subjects',
    example: '—',
    description: 'Lab or practical component score',
  },
  {
    key: 'ca_marks',
    label: 'Continuous Assessment (Table Column)',
    category: 'subjects',
    example: '—',
    description: 'Continuous assessment or assignment score',
  },
  {
    key: 'obtained_marks',
    label: 'Subject Obtained Marks (Table Column)',
    category: 'subjects',
    example: '90',
    description: 'Total marks secured in this subject',
  },
  {
    key: 'percentage',
    label: 'Subject Percentage (Table Column)',
    category: 'subjects',
    example: '90.00%',
    description: 'Subject score percentage',
  },
  {
    key: 'grade_point',
    label: 'Subject GPA / Grade Point (Table Column)',
    category: 'subjects',
    example: '5.00',
    description: 'Subject grade point',
  },
  {
    key: 'grade',
    label: 'Subject Letter Grade (Table Column)',
    category: 'subjects',
    example: 'A+',
    description: 'Subject letter grade',
  },
  {
    key: 'status',
    label: 'Subject Status (Table Column)',
    category: 'subjects',
    example: 'PASSED',
    description: 'Subject pass / fail / absent status',
  },

  // ─── Fixed Subject Slot Keys (Slots 1 to 15) ───────────────────────
  ...generateSubjectSlotTaxonomyKeys(15),

  // ─── Grading Scale Reference Rules (1 to 7) ────────────────────────
  {
    key: 'grade_rule_1_range',
    label: 'Grade Rule 1 Range',
    category: 'grading_scale',
    example: '80% - 100%',
    description: 'Marks range for highest grade (A+)',
  },
  {
    key: 'grade_rule_1_grade',
    label: 'Grade Rule 1 Grade',
    category: 'grading_scale',
    example: 'A+',
    description: 'Letter grade for tier 1',
  },
  {
    key: 'grade_rule_1_gpa',
    label: 'Grade Rule 1 GPA',
    category: 'grading_scale',
    example: '5.00',
    description: 'Grade point for tier 1',
  },
  {
    key: 'grade_rule_2_range',
    label: 'Grade Rule 2 Range',
    category: 'grading_scale',
    example: '70% - 79%',
    description: 'Marks range for tier 2 (A)',
  },
  {
    key: 'grade_rule_2_grade',
    label: 'Grade Rule 2 Grade',
    category: 'grading_scale',
    example: 'A',
    description: 'Letter grade for tier 2',
  },
  {
    key: 'grade_rule_2_gpa',
    label: 'Grade Rule 2 GPA',
    category: 'grading_scale',
    example: '4.00',
    description: 'Grade point for tier 2',
  },
  {
    key: 'grade_rule_3_range',
    label: 'Grade Rule 3 Range',
    category: 'grading_scale',
    example: '60% - 69%',
    description: 'Marks range for tier 3 (A-)',
  },
  {
    key: 'grade_rule_3_grade',
    label: 'Grade Rule 3 Grade',
    category: 'grading_scale',
    example: 'A-',
    description: 'Letter grade for tier 3',
  },
  {
    key: 'grade_rule_3_gpa',
    label: 'Grade Rule 3 GPA',
    category: 'grading_scale',
    example: '3.50',
    description: 'Grade point for tier 3',
  },
  {
    key: 'grade_rule_4_range',
    label: 'Grade Rule 4 Range',
    category: 'grading_scale',
    example: '50% - 59%',
    description: 'Marks range for tier 4 (B)',
  },
  {
    key: 'grade_rule_4_grade',
    label: 'Grade Rule 4 Grade',
    category: 'grading_scale',
    example: 'B',
    description: 'Letter grade for tier 4',
  },
  {
    key: 'grade_rule_4_gpa',
    label: 'Grade Rule 4 GPA',
    category: 'grading_scale',
    example: '3.00',
    description: 'Grade point for tier 4',
  },
  {
    key: 'grade_rule_5_range',
    label: 'Grade Rule 5 Range',
    category: 'grading_scale',
    example: '40% - 49%',
    description: 'Marks range for tier 5 (C)',
  },
  {
    key: 'grade_rule_5_grade',
    label: 'Grade Rule 5 Grade',
    category: 'grading_scale',
    example: 'C',
    description: 'Letter grade for tier 5',
  },
  {
    key: 'grade_rule_5_gpa',
    label: 'Grade Rule 5 GPA',
    category: 'grading_scale',
    example: '2.00',
    description: 'Grade point for tier 5',
  },
  {
    key: 'grade_rule_6_range',
    label: 'Grade Rule 6 Range',
    category: 'grading_scale',
    example: '33% - 39%',
    description: 'Marks range for tier 6 (D)',
  },
  {
    key: 'grade_rule_6_grade',
    label: 'Grade Rule 6 Grade',
    category: 'grading_scale',
    example: 'D',
    description: 'Letter grade for tier 6',
  },
  {
    key: 'grade_rule_6_gpa',
    label: 'Grade Rule 6 GPA',
    category: 'grading_scale',
    example: '1.00',
    description: 'Grade point for tier 6',
  },
  {
    key: 'grade_rule_7_range',
    label: 'Grade Rule 7 Range',
    category: 'grading_scale',
    example: '0% - 32%',
    description: 'Marks range for failing tier (F)',
  },
  {
    key: 'grade_rule_7_grade',
    label: 'Grade Rule 7 Grade',
    category: 'grading_scale',
    example: 'F',
    description: 'Letter grade for failing tier',
  },
  {
    key: 'grade_rule_7_gpa',
    label: 'Grade Rule 7 GPA',
    category: 'grading_scale',
    example: '0.00',
    description: 'Grade point for failing tier',
  },

  // ─── Signatures & Issuance ─────────────────────────────────────────
  {
    key: 'issue_date',
    label: 'Issue Date',
    category: 'system',
    example: new Date().toLocaleDateString('en-GB'),
    description: 'Date of transcript issuance',
  },
  {
    key: 'print_date',
    label: 'Print Date',
    category: 'system',
    example: new Date().toLocaleDateString('en-GB'),
    description: 'Date of printing',
  },
  {
    key: 'principal_signature',
    label: 'Principal Signature Line',
    category: 'signatures',
    example: 'Principal / Headmaster',
    description: 'Formal signatory authority designation',
  },
  {
    key: 'principal_name',
    label: 'Principal Full Name',
    category: 'signatures',
    example: 'Maulana Dr. Abdur Rahman',
    description: 'Name of the principal or head of institution',
  },
  {
    key: 'class_teacher_signature',
    label: 'Class Teacher Signature Line',
    category: 'signatures',
    example: 'Class Teacher',
    description: 'Class teacher verification signature',
  },
  {
    key: 'class_teacher_name',
    label: 'Class Teacher Full Name',
    category: 'signatures',
    example: 'Ustadh Mahmud Hasan',
    description: 'Name of the class teacher',
  },
  {
    key: 'exam_controller_signature',
    label: 'Controller of Exams Signature Line',
    category: 'signatures',
    example: 'Controller of Examinations',
    description: 'Examination authority signature line',
  },
  {
    key: 'exam_controller_name',
    label: 'Controller of Exams Full Name',
    category: 'signatures',
    example: 'Exam Controller',
    description: 'Name of examination controller',
  },
  {
    key: 'guardian_signature',
    label: 'Parent / Guardian Signature Line',
    category: 'signatures',
    example: 'Parent / Guardian Signature',
    description: 'Guardian signature acknowledgment line',
  },
];

export interface EnrichedStudentTranscriptRecord {
  id: string;
  studentId: string | number;
  student_name: string;
  student_name_bn: string;
  student_name_ar?: string;
  roll_number: string;
  student_id: string;
  reg_no: string;
  admission_no: string;
  father_name: string;
  father_name_bn: string;
  mother_name: string;
  mother_name_bn: string;
  guardian_name: string;
  guardian_phone: string;
  dob: string;
  gender: string;
  blood_group: string;
  student_photo: string;
  student_address: string;
  class_name: string;
  class_name_bn: string;
  section_name: string;
  academic_session: string;
  academic_year: string;
  group_name: string;
  shift: string;
  medium: string;
  class_teacher_name: string;
  exam_name: string;
  exam_date: string;
  exam_term: string;
  total_students: number | string;
  total_subjects: number;
  total_subjects_count: number;
  total_marks: number;
  total_full_marks?: number;
  obtained_marks: number | string;
  total_obtained_marks?: number | string;
  average_marks: string | number;
  avg_marks?: string | number;
  highest_marks: number | string;
  highest_total: number | string;
  highest_gpa: string;
  highest_percentage: string;
  highest_grade: string;
  percentage: string;
  overall_percentage?: string;
  gpa: string;
  overall_gpa?: string;
  grade: string;
  letter_grade?: string;
  division: string;
  merit_position: string;
  merit_status: string;
  result_summary: string;
  class_rank: string;
  section_rank: string;
  rank?: string;
  result_status: string;
  passed_subjects_count: number;
  failed_subjects_count: number;
  attendance_working_days: number | string;
  attendance_present_days: number | string;
  attendance_percentage: string;
  teacher_remarks: string;
  conduct_remarks: string;
  issue_date: string;
  print_date: string;
  principal_signature: string;
  principal_name: string;
  class_teacher_signature: string;
  exam_controller_signature: string;
  exam_controller_name: string;
  guardian_signature: string;
  subjectMarks: any[];
  subjects: any[];
  [key: string]: any;
}

/**
 * Builds a single enriched student transcript record object with all smart aliases and taxonomy keys.
 */
export function buildSingleStudentTranscriptData({
  studentResult,
  allStudents = [],
  exam,
  className = 'Class',
  sectionName = 'All Sections',
  institutionName = 'SPR Academy',
  institutionAddress = '',
  subjects = [],
  gradingSystem = null,
}: {
  studentResult: StudentResult | null;
  allStudents?: StudentResult[];
  exam: any;
  className?: string;
  sectionName?: string;
  institutionName?: string;
  institutionAddress?: string;
  subjects?: any[];
  gradingSystem?: GradingSystem | null;
}): EnrichedStudentTranscriptRecord {
  const st = studentResult;
  const name = st?.studentName || 'Student';
  const nameBn = (st as any)?.studentNameBn || name;
  const nameAr = (st as any)?.studentNameAr || '';
  const roll = st?.rollNumber || '-';
  const uniqId = st?.studentUniqId || (st?.studentId ? `ST-${st.studentId}` : '-');
  const regNo = (st as any)?.regNo || (st as any)?.registrationNo || uniqId;
  const admissionNo = (st as any)?.admissionNo || (st as any)?.admissionNumber || '-';

  const fatherName = (st as any)?.fatherName || (st as any)?.father || '-';
  const fatherNameBn = (st as any)?.fatherNameBn || fatherName;
  const motherName = (st as any)?.motherName || (st as any)?.mother || '-';
  const motherNameBn = (st as any)?.motherNameBn || motherName;
  const guardianName = (st as any)?.guardianName || fatherName;
  const guardianPhone = (st as any)?.guardianPhone || (st as any)?.phone || (st as any)?.mobile || '-';
  const dob = (st as any)?.dob || (st as any)?.dateOfBirth || '-';
  const gender = (st as any)?.gender || '-';
  const bloodGroup = (st as any)?.bloodGroup || '-';
  const studentPhoto = (st as any)?.photoUrl || (st as any)?.photo || '[Student Photo]';
  const studentAddress = (st as any)?.address || (st as any)?.presentAddress || '';

  const examName = exam?.name || 'Academic Examination';
  const examDate = exam?.startDate || exam?.examDate || new Date().toLocaleDateString('en-GB');
  const examTerm = exam?.semesterName || exam?.termName || 'Annual';
  const session = exam?.academicYearName || (st as any)?.academicSession || '2025-2026';
  const groupName = (st as any)?.groupName || (st as any)?.departmentName || 'General';
  const shift = (st as any)?.shift || 'Morning';
  const medium = (st as any)?.medium || 'Bangla';
  const classTeacherName = (st as any)?.classTeacherName || 'Ustadh Mahmud Hasan';

  const totalFull = computeTotalFullMarks(st, subjects);
  const totalObtained = st?.totalObtained ?? computeTotalObtainedMarks(st);
  const gpa = st?.overallGpa !== null && st?.overallGpa !== undefined ? Number(st.overallGpa).toFixed(2) : '-';
  const grade = st?.grade || st?.division || (st?.isOverallPass ? 'P' : 'F');
  const division = st?.division || grade;
  const rankOrdinal = formatRankOrdinal(st?.classRank);
  const rankNum = st?.classRank && st?.classRank !== '-' ? String(st.classRank) : '-';
  const sectionRankNum = (st as any)?.sectionRank ? String((st as any).sectionRank) : rankNum;
  const percentage = st?.overallPercentage !== undefined && st?.overallPercentage !== null
    ? `${Number(st.overallPercentage).toFixed(2)}%`
    : '0.00%';
  const isPass = st?.isOverallPass !== false;
  const statusText = isPass ? 'PASSED' : 'FAILED';

  // Compute class-wide statistics across all students if available
  const studentPool = Array.isArray(allStudents) && allStudents.length > 0 ? allStudents : (st ? [st] : []);
  const totalStudentsCount = studentPool.length;

  let classHighestTotalMarks: number | string = '-';
  let classHighestGpa: string = '-';
  let classHighestPercentage: string = '-';
  let classHighestGrade = 'A+';

  if (studentPool.length > 0) {
    const obtainedScores = studentPool.map((s) => Number(s.totalObtained ?? computeTotalObtainedMarks(s) ?? 0));
    const maxTotal = Math.max(...obtainedScores);
    classHighestTotalMarks = maxTotal > 0 ? maxTotal : (totalObtained || '-');

    const gpaScores = studentPool
      .map((s) => Number(s.overallGpa || 0))
      .filter((g) => !isNaN(g) && g > 0);
    if (gpaScores.length > 0) {
      classHighestGpa = Math.max(...gpaScores).toFixed(2);
    } else if (gpa !== '-') {
      classHighestGpa = gpa;
    }

    const pctScores = studentPool
      .map((s) => Number(s.overallPercentage || 0))
      .filter((p) => !isNaN(p) && p > 0);
    if (pctScores.length > 0) {
      classHighestPercentage = `${Math.max(...pctScores).toFixed(2)}%`;
    } else {
      classHighestPercentage = percentage;
    }
  }

  // Pre-calculate subject-wise highest marks across all students in pool
  const subjectHighestMap: Record<string, number> = {};
  studentPool.forEach((s) => {
    (s.subjectMarks || []).forEach((sm) => {
      const key = String(sm.subjectId || sm.subjectName || '');
      const mark = Number(sm.obtained || 0);
      if (!subjectHighestMap[key] || mark > subjectHighestMap[key]) {
        subjectHighestMap[key] = mark;
      }
    });
  });

  // Attendance & Remarks
  const workingDays = (st as any)?.attendanceWorkingDays || (st as any)?.workingDays || 120;
  const presentDays = (st as any)?.attendancePresentDays || (st as any)?.presentDays || 118;
  const attendancePct = (st as any)?.attendancePercentage
    ? `${(st as any).attendancePercentage}%`
    : `${((Number(presentDays) / Number(workingDays || 1)) * 100).toFixed(1)}%`;
  const teacherRemarks = (st as any)?.teacherRemarks || (st as any)?.remarks || (isPass ? 'Good academic performance.' : 'Needs improvement.');
  const conductRemarks = (st as any)?.conductRemarks || 'Satisfactory';

  const issueDate = new Date().toLocaleDateString('en-GB');

  // Normalized list of subject marks for repeating table rows & loop tags
  const rawSubjectMarks = st?.subjectMarks || [];
  const normalizedSubjectMarks = rawSubjectMarks.map((sm, idx) => {
    const sKey = String(sm.subjectId || sm.subjectName || '');
    const sHighest = sm.highest ?? sm.highestMarks ?? subjectHighestMap[sKey] ?? sm.obtained ?? '-';
    const sFull = sm.full ?? 100;
    const sPass = sm.pass ?? 33;
    const sObtained = sm.isAbsent ? 'ABS' : (sm.obtained ?? '-');
    const sPct = sm.isAbsent
      ? '0%'
      : sm.obtained !== undefined && sm.obtained !== null && sFull
      ? `${((Number(sm.obtained) / Number(sFull)) * 100).toFixed(2)}%`
      : '-';
    const sGpa = sm.gradePoint !== undefined && sm.gradePoint !== null ? Number(sm.gradePoint).toFixed(2) : '-';
    const sGrade = sm.grade || (sm.isPassed ? 'P' : 'F');
    const sStatus = sm.isAbsent ? 'ABSENT' : (sm.isPassed ? 'PASSED' : 'FAILED');

    let rawSubName = String(sm.subjectName || sm.name || '');
    let resolvedSubjectName = rawSubName;

    if (!resolvedSubjectName || resolvedSubjectName.startsWith('routine_') || resolvedSubjectName.includes('_syllabus_')) {
      const matched = subjects?.find(
        (sub) => String(sub.id) === String(sm.subjectId) || String(sub.subjectName) === String(rawSubName)
      );
      if (matched?.subjectName && !matched.subjectName.startsWith('routine_')) {
        resolvedSubjectName = matched.subjectName;
      } else if (matched?.curriculumBookName) {
        resolvedSubjectName = matched.curriculumBookName;
      } else if (rawSubName.includes('syllabus_')) {
        const rawPart = rawSubName.split('syllabus_')[1]?.replace(/_/g, ' ') || '';
        resolvedSubjectName = `Subject ${idx + 1} (${rawPart})`;
      } else {
        resolvedSubjectName = `Subject ${idx + 1}`;
      }
    }

    return {
      sl: idx + 1,
      serial: idx + 1,
      index: idx + 1,
      subject_id: sm.subjectId,
      subject_name: resolvedSubjectName,
      subjectName: resolvedSubjectName,
      name: resolvedSubjectName,
      title: resolvedSubjectName,
      subject_code: sm.code || sm.subjectCode || String(101 + idx),
      subjectCode: sm.code || sm.subjectCode || String(101 + idx),
      total_marks: sFull,
      totalMarks: sFull,
      full_marks: sFull,
      full: sFull,
      pass_marks: sPass,
      pass: sPass,
      highest_marks: sHighest,
      highest: sHighest,
      cq_marks: sm.cq ?? sm.creative ?? sm.theory ?? '—',
      cq: sm.cq ?? sm.creative ?? sm.theory ?? '—',
      mcq_marks: sm.mcq ?? '—',
      mcq: sm.mcq ?? '—',
      practical_marks: sm.practical ?? sm.pr ?? '—',
      practical: sm.practical ?? sm.pr ?? '—',
      ca_marks: sm.ca ?? sm.continuous ?? '—',
      ca: sm.ca ?? sm.continuous ?? '—',
      obtained_marks: sObtained,
      obtained: sObtained,
      percentage: sPct,
      grade_point: sGpa,
      gpa: sGpa,
      grade: sGrade,
      status: sStatus,
      result_status: sStatus,
    };
  });

  // Compute subject counts and average marks per subject
  const subjectCount = normalizedSubjectMarks.length || rawSubjectMarks.length || (subjects?.length || 1);
  const numObtained = typeof totalObtained === 'number' ? totalObtained : parseFloat(String(totalObtained)) || 0;
  const avgMarksValue = subjectCount > 0 ? (numObtained / subjectCount) : 0;
  const averageMarksStr = avgMarksValue > 0 ? avgMarksValue.toFixed(2) : (percentage ? percentage.replace('%', '') : '0.00');

  // Format rich Merit Status & Result Summary
  const meritPositionStr = rankOrdinal || (rankNum !== '-' ? `${rankNum}` : '-');
  const meritStatusStr = meritPositionStr !== '-'
    ? `${meritPositionStr}${division && division !== '-' ? ` (${division})` : ''} • ${statusText}`
    : `${statusText}${division && division !== '-' ? ` (${division})` : ''}`;
  const resultSummaryStr = `${statusText} • GPA: ${gpa} • Grade: ${grade}${meritPositionStr !== '-' ? ` • Merit: ${meritPositionStr}` : ''}`;

  // Base enriched record
  const record: EnrichedStudentTranscriptRecord = {
    id: String(st?.studentId || 'st_1'),
    studentId: st?.studentId || '1',
    student_name: name,
    student_name_bn: nameBn,
    student_name_ar: nameAr,
    roll_number: String(roll),
    roll: String(roll),
    student_id: String(uniqId),
    reg_no: String(regNo),
    admission_no: String(admissionNo),
    father_name: fatherName,
    father_name_bn: fatherNameBn,
    mother_name: motherName,
    mother_name_bn: motherNameBn,
    guardian_name: guardianName,
    guardian_phone: guardianPhone,
    dob: String(dob),
    gender: String(gender),
    blood_group: String(bloodGroup),
    student_photo: studentPhoto,
    student_address: studentAddress,
    class_name: className,
    class_name_bn: (st as any)?.classNameBn || className,
    section_name: sectionName && sectionName !== 'ALL' ? sectionName : 'All Sections',
    academic_session: session,
    academic_year: session,
    group_name: groupName,
    shift: shift,
    medium: medium,
    class_teacher_name: classTeacherName,
    exam_name: examName,
    exam_date: examDate,
    exam_term: examTerm,
    total_students: totalStudentsCount,
    total_subjects: subjectCount,
    total_subjects_count: subjectCount,
    total_marks: totalFull,
    total_full_marks: totalFull,
    obtained_marks: totalObtained,
    total_obtained_marks: totalObtained,
    total_obtained: totalObtained,
    average_marks: averageMarksStr,
    avg_marks: averageMarksStr,
    highest_marks: classHighestTotalMarks,
    highest_total: classHighestTotalMarks,
    highest_gpa: classHighestGpa,
    highest_percentage: classHighestPercentage,
    highest_grade: classHighestGrade,
    percentage: percentage,
    overall_percentage: percentage,
    gpa: gpa,
    overall_gpa: gpa,
    gpa_score: gpa,
    grade_point_average: gpa,
    grade: grade,
    letter_grade: grade,
    final_grade: grade,
    division: division,
    merit_position: meritPositionStr,
    merit_status: meritStatusStr,
    result_summary: resultSummaryStr,
    class_rank: rankNum,
    section_rank: sectionRankNum,
    rank: rankNum,
    merit_rank: rankNum,
    result_status: statusText,
    passed_subjects_count: rawSubjectMarks.filter((s) => s.isPassed).length,
    failed_subjects_count: rawSubjectMarks.filter((s) => !s.isPassed && !s.isAbsent).length,
    attendance_working_days: workingDays,
    attendance_present_days: presentDays,
    attendance_percentage: attendancePct,
    teacher_remarks: teacherRemarks,
    conduct_remarks: conductRemarks,
    issue_date: issueDate,
    print_date: issueDate,
    principal_signature: 'Principal / Headmaster',
    principal_name: 'Principal',
    class_teacher_signature: 'Class Teacher',
    exam_controller_signature: 'Controller of Examinations',
    exam_controller_name: 'Exam Controller',
    guardian_signature: 'Parent / Guardian Signature',
    subjectMarks: normalizedSubjectMarks,
    subjects: normalizedSubjectMarks,
  };

  // Populate dynamic numbered subject slot keys (up to 30 slots)
  normalizedSubjectMarks.forEach((sm, idx) => {
    const sIdx = idx + 1;
    record[`subject_${sIdx}_name`] = sm.subject_name;
    record[`subject_${sIdx}_code`] = sm.subject_code;
    record[`subject_${sIdx}_full`] = sm.full_marks;
    record[`subject_${sIdx}_pass`] = sm.pass_marks;
    record[`subject_${sIdx}_highest`] = sm.highest_marks;
    record[`subject_${sIdx}_cq`] = sm.cq_marks;
    record[`subject_${sIdx}_mcq`] = sm.mcq_marks;
    record[`subject_${sIdx}_practical`] = sm.practical_marks;
    record[`subject_${sIdx}_ca`] = sm.ca_marks;
    record[`subject_${sIdx}_obtained`] = sm.obtained_marks;
    record[`subject_${sIdx}_percentage`] = sm.percentage;
    record[`subject_${sIdx}_gpa`] = sm.grade_point;
    record[`subject_${sIdx}_grade`] = sm.grade;
    record[`subject_${sIdx}_status`] = sm.status;
  });

  // Populate dynamic grading scale rules directly from active grading system or examStore
  let rules: any[] = [];
  if (gradingSystem?.rules && gradingSystem.rules.length > 0) {
    rules = gradingSystem.rules;
  } else {
    try {
      const tenant = exam?.tenantId || 'default';
      if (exam?.gradingScaleId) {
        const found = examStore.getGradingSystemById(tenant, exam.gradingScaleId);
        if (found?.rules && found.rules.length > 0) {
          rules = found.rules;
        }
      }
      if (rules.length === 0) {
        const allSystems = examStore.getGradingSystems(tenant) || [];
        const defaultSys = allSystems.find((s: any) => s.isDefault) || allSystems[0];
        if (defaultSys?.rules) {
          rules = defaultSys.rules;
        }
      }
    } catch (e) {
      console.warn('Failed to load grading system from examStore', e);
    }
  }

  rules.forEach((rule: any, idx) => {
    const rIdx = idx + 1;
    const minP = rule.minPercentage !== undefined ? `${rule.minPercentage}%` : (rule.minMark !== undefined ? `${rule.minMark}%` : '');
    const maxP = rule.maxPercentage !== undefined ? `${rule.maxPercentage}%` : (rule.maxMark !== undefined ? `${rule.maxMark}%` : '');
    const rangeStr = rule.range || (minP && maxP ? `${minP} - ${maxP}` : rule.title || '-');
    const gpaStr = rule.gpa !== undefined ? Number(rule.gpa).toFixed(2) : rule.gradePoint !== undefined ? Number(rule.gradePoint).toFixed(2) : '-';

    record[`grade_rule_${rIdx}_range`] = rangeStr;
    record[`grade_rule_${rIdx}_grade`] = rule.grade || '-';
    record[`grade_rule_${rIdx}_gpa`] = gpaStr;
    record[`grade_rule_${rIdx}_title`] = rule.title || rule.remarks || '-';
  });

  return record;
}

/**
 * Builds an array of enriched student transcript records for batch/bulk print workflows.
 */
export function buildBulkStudentTranscriptData({
  studentsData,
  allStudents = [],
  exam,
  className = 'Class',
  sectionName = 'All Sections',
  institutionName = 'SPR Academy',
  institutionAddress = '',
  subjects = [],
  gradingSystem = null,
}: {
  studentsData: StudentResult[];
  allStudents?: StudentResult[];
  exam: any;
  className?: string;
  sectionName?: string;
  institutionName?: string;
  institutionAddress?: string;
  subjects?: any[];
  gradingSystem?: GradingSystem | null;
}): EnrichedStudentTranscriptRecord[] {
  const pool = allStudents.length > 0 ? allStudents : studentsData;
  return studentsData.map((student) =>
    buildSingleStudentTranscriptData({
      studentResult: student,
      allStudents: pool,
      exam,
      className,
      sectionName,
      institutionName,
      institutionAddress,
      subjects,
      gradingSystem,
    })
  );
}

/**
 * Mandatory required placeholder keys for Student MarkSheet & Transcript scope templates.
 * Strict, minimal, and fully comprehensive.
 */
export const STUDENT_MARKSHEET_REQUIRED_KEYS: string[] = [
  'student_name',
  'roll_number',
  'student_id',
  'class_name',
  'section_name',
  'academic_session',
  'exam_name',
  'total_marks',
  'obtained_marks',
  'average_marks',
  'gpa',
  'grade',
  'merit_position',
  'result_status',
];
