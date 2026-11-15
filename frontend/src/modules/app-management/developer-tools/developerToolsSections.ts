import { DeveloperToolsSectionItem } from "./types";
import {
  BuildingOfficeIcon,
  TimerIcon,
  ClockIcon,
  BookOpenIcon,
  AcademicCapIcon,
  GroupsIcon,
  TeacherIcon,
  ChecklistIcon,
  CalendarIcon,
  SessionsIcon,
  SettingsIcon,
  RefreshIcon,
  MailIcon,
  TrashIcon,
  SparklesIcon,
} from "../../../components/ui/Icons";

// ─── Group 1: Academic Structure ─────────────────────────────────────────────

export const academyCategoriesSectionConfig: DeveloperToolsSectionItem = {
  id: "categories",
  group: "Academic Structure",
  title: "Academy Categories",
  description: "Manage institution types, curriculum categories, and taxonomies",
  icon: BuildingOfficeIcon,
};

export const branchCategoriesSectionConfig: DeveloperToolsSectionItem = {
  id: "branch-categories",
  group: "Academic Structure",
  title: "Branch & Campus Categories",
  description: "Configure campus classifications, branch types (Main Campus, Sub Branch, Residential Complex), and campus scopes",
  icon: BuildingOfficeIcon,
};

export const periodSequencesSectionConfig: DeveloperToolsSectionItem = {
  id: "period-sequences",
  group: "Academic Structure",
  title: "Period Sequences & Numbers",
  description: "Manage configurable daily timetable period sequences, ordinal names (1st Period, 2nd Period, etc.), and slot rank orders",
  icon: TimerIcon,
};

export const periodCategoriesSectionConfig: DeveloperToolsSectionItem = {
  id: "period-categories",
  group: "Academic Structure",
  title: "Period Categories",
  description: "Manage pre-configured lecture slots, break intervals, prayer times, and study session types",
  icon: ClockIcon,
};

export const academicSubjectsSectionConfig: DeveloperToolsSectionItem = {
  id: "academic-subjects",
  group: "Academic Structure",
  title: "Curriculum Subjects",
  description: "Manage textbook subjects, Islamic sciences (Fiqh, Hadith, Tafsir, Nahw), and academic disciplines across syllabus tracking",
  icon: BookOpenIcon,
};

export const gradingPoliciesSectionConfig: DeveloperToolsSectionItem = {
  id: "grading-policies",
  group: "Academic Structure",
  title: "Grading Policies & GPA Scales",
  description: "Universal grading scale builder, GPA thresholds, letter marks, and division honors across Dars-e-Nizami, National 5.0 GPA, and University 4.0 scales",
  icon: AcademicCapIcon,
};

// ─── Group 2: Staff Management ───────────────────────────────────────────────

export const staffCategoriesSectionConfig: DeveloperToolsSectionItem = {
  id: "staff-categories",
  group: "Staff Management",
  title: "Staff Categories",
  description: "Configure institutional staff classification categories (Teaching Faculty, Management, Administration, Finance, Support)",
  icon: GroupsIcon,
};

export const staffRanksSectionConfig: DeveloperToolsSectionItem = {
  id: "staff-ranks",
  group: "Staff Management",
  title: "Staff Ranks & Designations",
  description: "Institutional hierarchy, designations, and faculty rank priorities (Principal, Professor, Senior Faculty, etc.)",
  icon: TeacherIcon,
};

export const staffRecruitmentRulesSectionConfig: DeveloperToolsSectionItem = {
  id: "staff-recruitment-rules",
  group: "Staff Management",
  title: "Recruitment Rules & Roles",
  description: "Configure employee recruitment rules, designation qualification baselines, and institutional salary grade brackets",
  icon: ChecklistIcon,
};

// ─── Group 3: Calendar & Schedules ───────────────────────────────────────────

export const workingSchedulesSectionConfig: DeveloperToolsSectionItem = {
  id: "working-schedules",
  group: "Calendar & Schedules",
  title: "Working Hours & Shifts",
  description: "Manage operational shifts, faculty morning/afternoon timing windows, and working session presets",
  icon: CalendarIcon,
};

export const weeklyHolidaysSectionConfig: DeveloperToolsSectionItem = {
  id: "weekly-holidays",
  group: "Calendar & Schedules",
  title: "Weekly Holidays & Weekends",
  description: "Manage institutional weekends, Friday Jummah half-days, and weekly recurring off-days",
  icon: CalendarIcon,
};

export const eventTypesSectionConfig: DeveloperToolsSectionItem = {
  id: "event-types",
  group: "Calendar & Schedules",
  title: "Calendar Event Types",
  description: "Manage institutional event classifications, exam calendars, holidays, and campus activities",
  icon: CalendarIcon,
};

export const impactScopesSectionConfig: DeveloperToolsSectionItem = {
  id: "impact-scopes",
  group: "Calendar & Schedules",
  title: "System Impact Scopes",
  description: "Configure system modules affected by calendar events (Attendance, Notifications, etc.)",
  icon: ChecklistIcon,
};

// ─── Group 4: Attendance Policies ────────────────────────────────────────────

export const attendanceTimingSectionConfig: DeveloperToolsSectionItem = {
  id: "timing-rules",
  group: "Attendance Policies",
  title: "Attendance Timing Policies",
  description: "Configure start/late thresholds, edit lockout windows, auto-absent triggers, and overrides",
  icon: ClockIcon,
};

export const attendanceEventRestrictionsSectionConfig: DeveloperToolsSectionItem = {
  id: "event-restrictions",
  group: "Attendance Policies",
  title: "Class Attendance Off Events",
  description: "Configure which calendar event types and specific events disable class attendance and mark recess",
  icon: CalendarIcon,
};

// ─── Group 5: Admissions & Recruitment ───────────────────────────────────────

export const admissionSettingsSectionConfig: DeveloperToolsSectionItem = {
  id: "admission-settings",
  group: "Admissions & Recruitment",
  title: "Admission Policies & Fields",
  description: "Configure ongoing admission academic year, branch gender locking, and mother/emergency field visibility controls",
  icon: ChecklistIcon,
};

export const documentTypesSectionConfig: DeveloperToolsSectionItem = {
  id: "document-types",
  group: "Admissions & Recruitment",
  title: "Document Titles",
  description: "Manage pre-configured document titles, sanads, certificates, and identity credentials for staff and students",
  icon: SessionsIcon,
};

export const admissionDocRequirementsSectionConfig: DeveloperToolsSectionItem = {
  id: "admission-doc-requirements",
  group: "Admissions & Recruitment",
  title: "Admission Requirements",
  description: "Configure mandatory admission document requirements by class level (e.g. Play-5th, Hifz, 6th-10th, Dawra-e Hadith)",
  icon: ChecklistIcon,
};

// ─── Group 6: Classroom Configuration ────────────────────────────────────────

export const classroomSessionsSectionConfig: DeveloperToolsSectionItem = {
  id: "report-sessions",
  group: "Classroom Configuration",
  title: "Classroom Sessions",
  description: "Manage pre-configured classroom session topics and lesson progress categories (e.g. Sabaq, Saat Sabaq, Amukta, Hifz Revision, Nazira)",
  icon: SessionsIcon,
};

export const classroomConfigSectionConfig: DeveloperToolsSectionItem = {
  id: "classroom-config",
  group: "Classroom Configuration",
  title: "Classroom Configuration",
  description: "Configure classroom timezone display, default report copy formats, and date standards",
  icon: SettingsIcon,
};

// ─── Group 7: System & Platform Environment ──────────────────────────────────

export const versionControlSectionConfig: DeveloperToolsSectionItem = {
  id: "version-control",
  group: "System & Runtime",
  title: "Version Releases & Changelog",
  description: "Enterprise software version history, milestone notes, and update deployment logs",
  icon: RefreshIcon,
  superAdminOnly: true,
};

export const emailTemplatesSectionConfig: DeveloperToolsSectionItem = {
  id: "email-templates",
  group: "System & Runtime",
  title: "Email Templates & Mailer",
  description: "Live interactive rendering, variable sandbox, and SMTP testing console",
  icon: MailIcon,
  superAdminOnly: true,
};

export const trashRestorationSectionConfig: DeveloperToolsSectionItem = {
  id: "trash",
  group: "System & Runtime",
  title: "Trash & Restoration",
  description: "Inspect soft-deleted records and restore them back to system history",
  icon: TrashIcon,
};

export const systemEnvironmentSectionConfig: DeveloperToolsSectionItem = {
  id: "system",
  group: "System & Runtime",
  title: "System & Environment",
  description: "Platform version, environment diagnostics, and local cache manager",
  icon: SparklesIcon,
  superAdminOnly: true,
};

// ─── Unified Canonical Menu Structure (Single Source of Truth) ───────────────

/**
 * Metadata and catalog definitions for all Admin & Developer Tools / Institution Settings sections.
 * All groups, headers, menu titles, descriptions, and icons are centralized in this single file.
 */
export const DEVELOPER_TOOLS_SECTIONS: DeveloperToolsSectionItem[] = [
  // Group 1: Academic Structure
  academyCategoriesSectionConfig,
  branchCategoriesSectionConfig,
  periodSequencesSectionConfig,
  periodCategoriesSectionConfig,
  academicSubjectsSectionConfig,
  gradingPoliciesSectionConfig,

  // Group 2: Staff Management
  staffCategoriesSectionConfig,
  staffRanksSectionConfig,
  staffRecruitmentRulesSectionConfig,

  // Group 3: Calendar & Schedules
  workingSchedulesSectionConfig,
  weeklyHolidaysSectionConfig,
  eventTypesSectionConfig,
  impactScopesSectionConfig,

  // Group 4: Attendance Policies (আলাদা ডেডিকেটেড গ্রুপ)
  attendanceTimingSectionConfig,
  attendanceEventRestrictionsSectionConfig,

  // Group 5: Admissions & Recruitment
  admissionSettingsSectionConfig,
  documentTypesSectionConfig,
  admissionDocRequirementsSectionConfig,

  // Group 6: Classroom Configuration
  classroomSessionsSectionConfig,
  classroomConfigSectionConfig,

  // Group 7: System & Platform Environment
  versionControlSectionConfig,
  emailTemplatesSectionConfig,
  trashRestorationSectionConfig,
  systemEnvironmentSectionConfig,
];
