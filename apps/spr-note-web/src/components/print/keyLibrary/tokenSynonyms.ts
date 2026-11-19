/**
 * Enterprise Token Synonyms & Fuzzy Key Matcher
 *
 * Dedicated domain taxonomy dictionary providing fuzzy placeholder resolution
 * and cross-module key aliases (Academic, Classroom/Hifz, Finance, Examination, HR/Staff).
 *
 * Decoupled from core pagination and parsing engines in accordance with
 * DocLab Enterprise Layering Standards.
 */

export const UNIVERSAL_SYNONYM_GROUPS: string[][] = [
  // Student Profiles
  ['name', 'student_name', 'studentname', 'student_full_name', 'fullname', 'staff_name', 'employee_name'],
  ['roll', 'roll_number', 'rollnumber', 'roll_no', 'rollno'],
  ['student_id', 'studentid', 'student_uniq_id', 'reg_no', 'regno', 'uniq_id', 'student_code'],

  // Academic Scopes
  ['class', 'class_name', 'classname', 'class_section'],
  ['section', 'section_name', 'sectionname'],
  ['department', 'department_name', 'departmentname'],
  ['session', 'academic_session', 'academicsession', 'academic_year', 'academicyear'],
  ['institution', 'institution_name', 'institutionname', 'school_name', 'schoolname', 'academy_name', 'academyname'],
  ['subject', 'subject_name', 'subjectname', 'course_name', 'course'],

  // Examination & Grading
  ['exam', 'exam_name', 'examname', 'examination', 'exam_title'],
  ['grade', 'letter_grade', 'overall_grade', 'final_grade', 'result_grade'],
  ['gpa', 'overall_gpa', 'gpa_score', 'grade_point_average', 'cgpa', 'gp'],
  ['total', 'total_marks', 'totalmarks', 'grand_total', 'total_full_marks', 'totalfull'],
  ['obtained', 'obtained_marks', 'obtainedmarks', 'total_obtained', 'totalobtained', 'total_obtained_marks'],
  ['average_marks', 'avg_marks', 'averagemarks', 'avgmarks', 'average', 'mean_marks', 'avg', 'average_mark'],
  ['merit_position', 'merit', 'rank', 'class_rank', 'position', 'standing', 'merit_rank', 'merit_status', 'rank_ordinal', 'result_merit', 'merit_result'],
  ['result_status', 'status', 'exam_status', 'pass_status', 'result', 'qualification_status'],
  ['result_summary', 'resultsummary', 'summary', 'result_overview', 'academic_summary'],
  ['total_subjects', 'totalsubjects', 'total_subjects_count', 'subjects_count', 'subject_count'],
  ['highest_marks', 'highestmarks', 'highest', 'highest_total', 'highestmark', 'class_highest_marks'],
  ['highest_gpa', 'highestgpa'],
  ['highest_percentage', 'highestpercentage'],
  ['full_marks', 'fullmarks', 'full'],
  ['pass_marks', 'passmarks', 'pass'],
  ['cq_marks', 'cqmarks', 'cq', 'creative'],
  ['mcq_marks', 'mcqmarks', 'mcq'],
  ['practical_marks', 'practicalmarks', 'practical', 'pr'],
  ['ca_marks', 'camarks', 'ca', 'continuous'],

  // Accounts & Finance
  ['voucher_no', 'voucher', 'invoice_no', 'bill_no'],
  ['fee_amount', 'amount', 'payable_amount', 'total_fee'],
  ['paid_amount', 'paid', 'total_paid'],
  ['due_amount', 'due', 'balance'],

  // Staff & HR
  ['employee_id', 'staff_id', 'emp_id'],
  ['designation', 'designation_name', 'post', 'job_title'],
  ['mention_teacher_name', 'mentionteachername', 'teacher_name', 'teachername', 'teacher', 'evaluated_by', 'evaluator'],

  // Daily Classroom & Tahfeez Progress
  ['detail_mis', 'detailmis', 'detail_mi', 'detailmi', 'detail_mistake', 'detailmistake', 'detail_mistakes', 'detailmistakes', 'mistake_details', 'mistakedetails', 'mistake_detail', 'mistakedetail', 'mistakes', 'mistake'],
  ['detail_stuck', 'detailstuck', 'detail_stuck_point', 'stuck_details', 'stuckdetails', 'stuck_detail', 'stuckdetail', 'stuck'],
  ['total_mis', 'totalmis', 'total_mi', 'totalmi', 'total_mistakes', 'totalmistakes', 'total_mistake', 'totalmistake', 'mistakes_count', 'mistake_count'],
  ['total_stuck', 'totalstuck', 'total_stucks', 'totalstucks', 'stuck_count', 'stucks_count'],
  ['juz_number', 'juznumber', 'juz_no', 'juzno', 'juz', 'para', 'para_no', 'parano', 'para_number', 'paranumber'],
  ['juz_page', 'juzpage', 'page', 'pages', 'juz_pages', 'juzpages'],
  ['remarks', 'remark', 'comment', 'comments', 'teacher_remarks', 'teacher_comment', 'teacher_comments', 'note', 'notes'],
  ['date', 'report_date', 'reportdate', 'delivery_date', 'deliverydate', 'selected_date', 'selecteddate', 'evaluation_date', 'evaluationdate', 'formatted_date', 'formatteddate'],
];

/**
 * Metadata keys that should remain top-level single strings rather than multi-row aggregated lists
 */
export const PURE_METADATA_KEYS = new Set([
  'examname',
  'exam',
  'academicyear',
  'year',
  'session',
  'schoolname',
  'institutionname',
  'campusname',
  'campusaddress',
  'institutionaddress',
  'departmentname',
  'sectionname',
  'classname',
  'documenttitle',
  'title',
  'subtitle',
  'documentsubtitle',
  'issuedate',
  'currentdate',
  'pagesize',
  'orientation',
  'totalstudents',
  'totalrecords',
  'recordscount',
  'totalcount',
  'teachername',
  'staffname',
  'headmaster',
  'principal',
]);

/**
 * Finds all synonyms for a given token key
 */
export function getSynonymsForKey(targetKey: string): string[] {
  if (!targetKey) return [];
  const normalizedTarget = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const group of UNIVERSAL_SYNONYM_GROUPS) {
    if (group.some((syn) => syn.replace(/[^a-z0-9]/g, '') === normalizedTarget)) {
      return group;
    }
  }

  return [targetKey];
}

/**
 * Checks whether two keys are semantic synonyms of each other
 */
export function areKeysSynonyms(keyA: string, keyB: string): boolean {
  if (!keyA || !keyB) return false;
  const normA = keyA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = keyB.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normA === normB) return true;

  for (const group of UNIVERSAL_SYNONYM_GROUPS) {
    const hasA = group.some((s) => s.replace(/[^a-z0-9]/g, '') === normA);
    const hasB = group.some((s) => s.replace(/[^a-z0-9]/g, '') === normB);
    if (hasA && hasB) return true;
  }

  return false;
}
