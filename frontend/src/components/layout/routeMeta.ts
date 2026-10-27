/**
 * SPR Note — Layout Route Metadata Registry & Resolver
 * ====================================================
 * Maps application paths to their corresponding category and breadcrumb title.
 */

export interface RouteMeta {
  title: string;
  category: string;
  subCategory?: string;
  isDashboard?: boolean;
}

export const ROUTE_TITLE_MAP: Record<string, RouteMeta> = {
  "/": { title: "Dashboard", category: "Navigation", isDashboard: true },
  "/dashboard": { title: "Dashboard", category: "Navigation", isDashboard: true },
  "/studies": { title: "Lesson Management", category: "Daily Classroom" },
  "/studies/daily-classroom": { title: "Lesson Management", category: "Daily Classroom" },
  "/studies/lesson-management": { title: "Lesson Management", category: "Daily Classroom" },
  "/studies/progress-management": { title: "Progress Management", category: "Daily Classroom" },
  "/studies/daily-progress": { title: "Daily Progress", category: "Daily Classroom" },
  "/studies/progress-reports": { title: "Progress Reports", category: "Daily Classroom" },
  "/studies/progress-reports/records": { title: "Progress Reports", category: "Daily Classroom" },
  "/studies/progress-reports/by-student": { title: "Progress Reports", category: "Daily Classroom" },
  "/studies/progress-assessments": { title: "Progress Reports", category: "Daily Classroom" },
  "/studies/progress-analytics": { title: "Progress Analytics", category: "Daily Classroom" },
  "/progress-analytics": { title: "Progress Analytics", category: "Daily Classroom" },
  "/studies/lesson-assessments": { title: "Lesson Assessments", category: "Daily Classroom" },
  "/studies/daily-lessons": { title: "Daily Lessons", category: "Daily Classroom" },
  "/studies/lesson-analytics": { title: "Lesson Analytics", category: "Daily Classroom" },
  "/lesson-analytics": { title: "Lesson Analytics", category: "Daily Classroom" },
  "/studies/recitations": { title: "Lesson Assessments", category: "Daily Classroom" },
  "/studies/homework": { title: "Daily Homework", category: "Daily Classroom" },
  "/progress-management": { title: "Progress Management", category: "Daily Classroom" },
  "/daily-progress": { title: "Daily Progress", category: "Daily Classroom" },
  "/progress-reports": { title: "Progress Reports", category: "Daily Classroom" },
  "/daily-lessons": { title: "Daily Lessons", category: "Daily Classroom" },
  "/recitations": { title: "Daily Assessment", category: "Daily Classroom" },
  "/homework-tasks": { title: "Daily Homework", category: "Daily Classroom" },
  "/classroom-config": { title: "Classroom Configuration", category: "Admin Tools" },
  "/classroom-settings": { title: "Classroom Configuration", category: "Admin Tools" },
  "/copy-report": { title: "Classroom Configuration", category: "Admin Tools" },
  "/report-settings": { title: "Classroom Configuration", category: "Admin Tools" },
  "/sessions-comments": { title: "Classroom Sessions", category: "Admin Tools" },
  "/report-sessions": { title: "Classroom Sessions", category: "Admin Tools" },

  "/attendance/students/adhoc": { title: "Surprise Headcount", category: "Student Management" },
  "/attendance/students/monthly-matrix": { title: "Class Attendance", category: "Daily Classroom" },
  "/attendance/students/residential": { title: "Residential Attendance", category: "Student" },
  "/attendance/monthly-register": { title: "Class Attendance", category: "Daily Classroom" },

  "/attendance/settings": { title: "Attendance Settings", category: "Settings" },

  "/student-management/departments": { title: "Department", category: "Academy" },
  "/student-management/classes": { title: "Class", category: "Academy" },
  "/student-management/groups": { title: "Group", category: "Academy" },
  "/students": { title: "Student Roster", category: "Student" },
  "/groups-students": { title: "Student Roster", category: "Student" },
  "/student-roster": { title: "Student Roster", category: "Student" },
  "/staff/roster": { title: "Teacher & Staff Roster", category: "Staff Management" },
  "/staff/teacher-attendance": { title: "Teacher Class Attendance", category: "Staff Management" },
  "/staff/attendance": { title: "Staff Daily Attendance", category: "Staff Management" },
  "/staff/daily-attendance": { title: "Staff Daily Attendance", category: "Staff Management" },
  "/staff/onboarding": { title: "Staff Onboarding", category: "Staff Management" },
  "/staff": { title: "Teacher & Staff Roster", category: "Staff Management" },
  "/print-studio": { title: "Print Studio", category: "Print Studio" },
  "/finance": { title: "Finance & Accounts", category: "Finance" },
  "/finance/overview": { title: "Finance Overview", category: "Finance" },
  "/finance/student-billing": { title: "Student Billing & Fees", category: "Finance" },
  "/finance/staff-payroll": { title: "Staff Payroll", category: "Finance" },
  "/finance/general-ledger": { title: "General Ledger & Vouchers", category: "Finance" },
  "/finance/reports": { title: "Financial Statements", category: "Finance" },
  "/student-billing": { title: "Student Billing & Fees", category: "Finance" },
  "/staff-payroll": { title: "Staff Payroll", category: "Finance" },
  "/general-ledger": { title: "General Ledger & Vouchers", category: "Finance" },
  "/group-roster": { title: "Group", category: "Academy" },
  "/admission": { title: "Admission", category: "Student" },

  "/app-management/notifications": { title: "Notification Management", category: "App Management" },
  "/app-management/institutions": { title: "Academies", category: "Academy" },
  "/institutions": { title: "Academies", category: "Academy" },
  "/academy/campus-profile": { title: "Campus Structure", category: "Academy" },
  "/academy/classes-groups": { title: "Classes & Sections", category: "Academy" },
  "/classes-groups": { title: "Classes & Sections", category: "Academy" },
  "/academy/periods": { title: "Routine & Curriculum", category: "Academy" },
  "/academy/calendar-events": { title: "Calendar & Events", category: "Academy" },
  "/academy/calendar-schedule": { title: "Calendar & Events", category: "Academy" },
  "/academy/working-hours": { title: "Calendar & Events", category: "Academy" },
  "/academy/branches": { title: "Branches", category: "Academy" },
  "/academy/residential-quarters": { title: "Residential & Quarters", category: "Academy" },
  "/academy/residential": { title: "Residential & Quarters", category: "Academy" },
  "/academy/dormitory": { title: "Residential & Quarters", category: "Academy" },
  "/residential-quarters": { title: "Residential & Quarters", category: "Academy" },
  "/academy-profile": { title: "Profile & Branding", category: "Academy" },
  "/settings/institution": { title: "Profile & Branding", category: "Academy" },
  "/institution-profile": { title: "Profile & Branding", category: "Academy" },
  "/sp-management": { title: "SP Management", category: "Settings" },
  "/user-management": { title: "User Management", category: "App Management" },
  "/role-management": { title: "Role Management", category: "App Management" },
  "/activity-analytics": { title: "Activity Analytics", category: "App Management" },
  "/section-control": { title: "Feature & Module Control", category: "App Management" },

  "/profile-settings": { title: "Profile Settings", category: "Settings" },
  "/security-sessions": { title: "Security & Sessions", category: "Settings" },
  "/appearance": { title: "Appearance", category: "Settings" },
  "/date-time": { title: "Date & Time", category: "Settings" },
  "/language": { title: "Language", category: "Settings" },
  "/data-backup": { title: "Data & Backup", category: "Settings" },

  "/shortcuts": { title: "Shortcuts", category: "Shortcuts" },
  "/guide": { title: "App Guide", category: "App Guide" },
  // Examination & Result Management
  "/examinations": { title: "Examination & Results", category: "Examination & Results" },
  "/examinations/schedules": { title: "Exam Schedules", category: "Examination & Results" },
  "/examinations/routine-matrix": { title: "Subject Routine Matrix", category: "Examination & Results" },
  "/examinations/routine-board": { title: "2D Routine Board", category: "Examination & Results" },
  "/examinations/visual-timetable": { title: "2D Routine Board", category: "Examination & Results" },
  "/examinations/invigilation": { title: "Invigilation Schedule", category: "Examination & Results" },
  "/examinations/invigilation-schedule": { title: "Invigilation Schedule", category: "Examination & Results" },
  "/examinations/mark-entry": { title: "Mark Entry Desk", category: "Examination & Results" },
  "/examinations/tabulation": { title: "Tabulation Ledger", category: "Examination & Results" },
  "/examinations/transcripts": { title: "Marksheet Studio", category: "Examination & Results" },
  "/examinations/hall-logistics": { title: "Admit Cards & Hall Planning", category: "Examination & Results" },
  "/examinations/admit-cards": { title: "Admit Card Generator", category: "Examination & Results" },
  "/examinations/seat-plan": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/examinations/desk-slips": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/examinations/hall-attendance": { title: "Hall Attendance Sheets", category: "Examination & Results" },
  "/examinations/attendance-sheets": { title: "Hall Attendance Sheets", category: "Examination & Results" },
  "/admit-cards": { title: "Admit Card Generator", category: "Examination & Results" },
  "/seat-plan": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/desk-slips": { title: "Seat Plan & Desk Slips", category: "Examination & Results" },
  "/hall-attendance": { title: "Hall Attendance Sheets", category: "Examination & Results" },
  "/examinations/grading-rules": { title: "Grading Policies", category: "Examination & Results" },
  "/exams": { title: "Exam Schedules", category: "Examination & Results" },
  "/routine-matrix": { title: "Subject Routine Matrix", category: "Examination & Results" },
  "/routine-board": { title: "2D Routine Board", category: "Examination & Results" },
  "/visual-timetable": { title: "2D Routine Board", category: "Examination & Results" },
  "/invigilation-schedule": { title: "Invigilation Schedule", category: "Examination & Results" },
  "/mark-entry": { title: "Mark Entry Desk", category: "Examination & Results" },
  "/tabulation-sheet": { title: "Tabulation Ledger", category: "Examination & Results" },
  "/transcripts": { title: "Marksheet Studio", category: "Examination & Results" },
  "/grading-rules": { title: "Grading Policies", category: "Examination & Results" },

  "/about": { title: "About", category: "About" },
  "/trash-restoration": { title: "Trash & Restoration", category: "Admin Tools" },
  "/version-control": { title: "Version Control & Releases", category: "Admin Tools" },
  "/releases": { title: "Version Control & Releases", category: "Admin Tools" },
};

/**
 * Resolves breadcrumbs and category title based on URL pathname & query params
 */
export function resolveRouteMeta(pathname: string, search: string = ""): RouteMeta {
  const currentPath = pathname;
  let meta = ROUTE_TITLE_MAP[currentPath];

  if (currentPath === "/academy/campus-profile") {
    const searchParams = new URLSearchParams(search);
    const activeTab = searchParams.get("tab");
    if (activeTab === "branches") {
      meta = { title: "Branches", subCategory: "Academies & Departments", category: "Academy" };
    } else if (activeTab === "departments") {
      meta = { title: "Departments", subCategory: "Academies & Departments", category: "Academy" };
    } else {
      meta = { title: "Academies", subCategory: "Academies & Departments", category: "Academy" };
    }
  } else if (currentPath === "/academy/classes-groups" || currentPath === "/classes-groups") {
    const searchParams = new URLSearchParams(search);
    const activeTab = searchParams.get("tab");
    if (activeTab === "groups") {
      meta = { title: "Groups", subCategory: "Classes & Groups", category: "Academy" };
    } else {
      meta = { title: "Classes & Sections", subCategory: "Classes & Groups", category: "Academy" };
    }
  } else if (!meta) {
    if (/^\/students\/[^/]+\/profile/.test(currentPath)) {
      meta = { title: "Student Profile", category: "Student" };
    } else if (/^\/staff\/[^/]+/.test(currentPath)) {
      meta = { title: "Staff Profile", category: "Staff" };
    } else {
      meta = { title: "Navigation View", category: "Navigation" };
    }
  }

  return meta;
}
