import { DeveloperToolsSectionItem } from "./types";
import { academyCategoriesSectionConfig } from "../../academy/campus-structure/AcademyStructureTaxonomyPanels";
import {
  periodSequencesSectionConfig,
  periodCategoriesSectionConfig,
  academicSubjectsSectionConfig,
} from "../../academy/routine-curriculum/RoutineTaxonomyPanels";
import {
  staffCategoriesSectionConfig,
  staffRanksSectionConfig,
  staffRecruitmentRulesSectionConfig,
} from "../../staff-management/StaffTaxonomyPanels";
import { gradingPoliciesSectionConfig } from "../../examinations/grading-rules/GradingRulesView";
import {
  workingSchedulesSectionConfig,
  eventTypesSectionConfig,
  impactScopesSectionConfig,
} from "../../academy/calendar-events/CalendarSchedulesTaxonomyPanels";
import { weeklyHolidaysSectionConfig } from "../../academy/calendar-events/WeeklyHolidaySettingsPanel";
import { admissionSettingsSectionConfig } from "../../student-management/admission/AdmissionSettingsPanel";
import {
  documentTypesSectionConfig,
  admissionDocRequirementsSectionConfig,
} from "../../student-management/admission/AdmissionTaxonomyPanels";
import { classroomSessionsSectionConfig } from "../../student-management/sessions/SessionManager";
import { classroomConfigSectionConfig } from "../../learning/daily-classroom/components/ClassroomConfigurationView";
import { trashRestorationSectionConfig } from "../../admin/TrashRestorationView";
import { systemEnvironmentSectionConfig } from "./SystemEnvironmentPanel";
import { emailTemplatesSectionConfig } from "./EmailTemplatesPreviewPanel";
import { RefreshIcon, ClockIcon, CalendarIcon } from "../../../components/ui/Icons";

export const attendanceTimingSectionConfig: DeveloperToolsSectionItem = {
  id: "timing-rules",
  group: "Attendance & Schedules",
  title: "Attendance Timing Policies",
  description: "Configure start/late thresholds, edit lockout windows, auto-absent triggers, and overrides",
  icon: ClockIcon,
};

export const attendanceEventRestrictionsSectionConfig: DeveloperToolsSectionItem = {
  id: "event-restrictions",
  group: "Attendance & Schedules",
  title: "Class Attendance Off Events",
  description: "Configure which calendar event types and specific events disable class attendance and mark recess",
  icon: CalendarIcon,
};

export const versionControlSectionConfig: DeveloperToolsSectionItem = {
  id: "version-control",
  group: "System & Runtime",
  title: "Version Control & Releases",
  description: "Manage client deployment versions, force-updates, and structured changelogs",
  icon: RefreshIcon,
  superAdminOnly: true,
};

/**
 * Metadata and catalog definitions for all Admin & Developer Tools sections.
 * Aggregates decentralized section descriptors exported directly by their own feature modules.
 */
export const DEVELOPER_TOOLS_SECTIONS: DeveloperToolsSectionItem[] = [
  // Group 1: Academic Structure
  academyCategoriesSectionConfig,
  periodSequencesSectionConfig,
  periodCategoriesSectionConfig,
  academicSubjectsSectionConfig,
  gradingPoliciesSectionConfig,

  // Group 2: Staff Management
  staffCategoriesSectionConfig,
  staffRanksSectionConfig,
  staffRecruitmentRulesSectionConfig,

  // Group 3: Attendance & Calendar Schedules
  workingSchedulesSectionConfig,
  weeklyHolidaysSectionConfig,
  attendanceTimingSectionConfig,
  attendanceEventRestrictionsSectionConfig,
  eventTypesSectionConfig,
  impactScopesSectionConfig,

  // Group 4: Admissions
  admissionSettingsSectionConfig,
  documentTypesSectionConfig,
  admissionDocRequirementsSectionConfig,

  // Group 5: Classroom Configuration
  classroomSessionsSectionConfig,
  classroomConfigSectionConfig,

  // Group 5: System & Platform Environment
  versionControlSectionConfig,
  emailTemplatesSectionConfig,
  trashRestorationSectionConfig,
  systemEnvironmentSectionConfig,
];

