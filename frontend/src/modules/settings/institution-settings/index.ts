/**
 * SPR Note — Institution Settings Module Barrel
 * Enterprise configuration hub for academic structure, staff management,
 * calendar schedules, admissions, classroom configurations, and system runtime.
 */

export { default, default as InstitutionSettingsHubView, DeveloperToolsHubView } from './InstitutionSettingsHubView';
export {
  default as InstitutionSettingsContentRenderer,
  InstitutionSettingsContentRenderer as ContentRenderer,
  DeveloperToolsContentRenderer,
} from './InstitutionSettingsContentRenderer';
export type {
  InstitutionSettingsContentRendererProps,
  DeveloperToolsContentRendererProps,
} from './InstitutionSettingsContentRenderer';

export {
  INSTITUTION_SETTINGS_SECTIONS,
  DEVELOPER_TOOLS_SECTIONS,
  academyCategoriesSectionConfig,
  branchCategoriesSectionConfig,
  periodSequencesSectionConfig,
  periodCategoriesSectionConfig,
  academicSubjectsSectionConfig,
  gradingPoliciesSectionConfig,
  staffCategoriesSectionConfig,
  staffRanksSectionConfig,
  staffRecruitmentRulesSectionConfig,
  workingSchedulesSectionConfig,
  weeklyHolidaysSectionConfig,
  eventTypesSectionConfig,
  impactScopesSectionConfig,
  attendanceTimingSectionConfig,
  attendanceEventRestrictionsSectionConfig,
  admissionSettingsSectionConfig,
  documentTypesSectionConfig,
  admissionDocRequirementsSectionConfig,
  classroomSessionsSectionConfig,
  classroomReportFormatSectionConfig,
  classroomTimezoneSectionConfig,
  versionControlSectionConfig,
  emailTemplatesSectionConfig,
  trashRestorationSectionConfig,
  systemEnvironmentSectionConfig,
} from './institutionSettingsSections';

export type {
  InstitutionSettingsSectionItem,
  DeveloperToolsSectionItem,
  HealthDiagnosticsResponse,
  HealthServiceStatus,
} from './types';
