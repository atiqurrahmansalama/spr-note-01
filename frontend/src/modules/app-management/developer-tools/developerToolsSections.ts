import { DeveloperToolsSectionItem } from "./types";
import { academyCategoriesSectionConfig } from "../../academy/campus-structure/AcademyStructureTaxonomyPanels";
import {
  periodSequencesSectionConfig,
  periodCategoriesSectionConfig,
  academicSubjectsSectionConfig,
} from "../../academy/routine-curriculum/RoutineTaxonomyPanels";
import {
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
import { RefreshIcon } from "../../../components/ui/Icons";

export const versionControlSectionConfig: DeveloperToolsSectionItem = {
  id: "version-control",
  group: "System & Runtime",
  title: "Version Control & Releases",
  description: "Manage client deployment versions, force-updates, and structured changelogs",
  icon: RefreshIcon,
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
  staffRanksSectionConfig,
  academicSubjectsSectionConfig,
  gradingPoliciesSectionConfig,

  // Group 2: Event & Calendar Schedules
  workingSchedulesSectionConfig,
  weeklyHolidaysSectionConfig,
  eventTypesSectionConfig,
  impactScopesSectionConfig,

  // Group 3: Admissions & Recruitment Rules
  admissionSettingsSectionConfig,
  documentTypesSectionConfig,
  admissionDocRequirementsSectionConfig,
  staffRecruitmentRulesSectionConfig,

  // Group 4: Classroom Configuration
  classroomSessionsSectionConfig,
  classroomConfigSectionConfig,

  // Group 5: System & Platform Environment
  versionControlSectionConfig,
  emailTemplatesSectionConfig,
  trashRestorationSectionConfig,
  systemEnvironmentSectionConfig,
];

