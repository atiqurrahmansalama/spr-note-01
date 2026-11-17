import React from "react";
import { SessionsIcon } from "@/components/ui/Icons";
import { HealthDiagnosticsResponse } from "./types";

// Domain Feature Components
import { AcademyCategoriesPanel, BranchCategoriesPanel } from "@/modules/academy/campus-structure/AcademyStructureTaxonomyPanels";
import { PeriodSequencesPanel, PeriodCategoriesPanel, CurriculumSubjectsPanel } from "@/modules/academy/routine-curriculum/RoutineTaxonomyPanels";
import {
  StaffCategoriesPanel,
  StaffRanksPanel,
  StaffRecruitmentRulesPanel,
} from "@/modules/staff-management/StaffTaxonomyPanels";
import {
  WorkingSchedulesPanel,
  EventTypesPanel,
  ImpactScopesPanel,
} from "@/modules/academy/calendar-events/CalendarSchedulesTaxonomyPanels";
import WeeklyHolidaySettingsPanel from "@/modules/academy/calendar-events/WeeklyHolidaySettingsPanel";
import { AdmissionSettingsPanel } from "@/modules/student-management/admission/AdmissionSettingsPanel";
import {
  DocumentTypesPanel,
  ClassAdmissionRequirementsPanel,
} from "@/modules/student-management/admission/AdmissionTaxonomyPanels";
import GradingRulesView from "@/modules/examinations/grading-rules/GradingRulesView";
import {
  SessionManager,
  ClassroomReportFormatView,
  ClassroomTimezoneConfigView,
} from "@/modules/learning/daily-classroom";
import TrashRestorationView from "@/modules/admin/TrashRestorationView";
import { SystemEnvironmentPanel } from "./SystemEnvironmentPanel";
import { EmailTemplatesPreviewPanel } from "./EmailTemplatesPreviewPanel";
import { ReleaseManagementView } from "@/modules/version-control";
import AttendanceSettingsView from "@/modules/attendance/AttendanceSettingsView";


export interface InstitutionSettingsContentRendererProps {
  currentRenderSection: string;
  activeTenantId: string;
  eventKinds: any[];
  availableClassOptions: any[];
  classesList: any[];
  availableDocTitles: any[];
  healthData: HealthDiagnosticsResponse | null;
  onRefreshHealth: () => Promise<void>;
  onClearCache: () => void;
}

/**
 * Dedicated Section Content Renderer for Admin & Developer Tools.
 * Renders individual domain taxonomy and setting panels based on the active section tab.
 */
export const InstitutionSettingsContentRenderer: React.FC<InstitutionSettingsContentRendererProps> = ({
  currentRenderSection,
  activeTenantId,
  eventKinds,
  availableClassOptions,
  classesList,
  availableDocTitles,
  healthData,
  onRefreshHealth,
  onClearCache,
}) => {
  return (
    <div className="w-full">
      {/* Section 1: Academy Categories */}
      {currentRenderSection === "categories" && (
        <div className="w-full animate-fade-in">
          <AcademyCategoriesPanel />
        </div>
      )}

      {/* Section 1.5: Branch & Campus Categories */}
      {currentRenderSection === "branch-categories" && (
        <div className="w-full animate-fade-in">
          <BranchCategoriesPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Period Sequences & Numbers */}
      {currentRenderSection === "period-sequences" && (
        <div className="w-full animate-fade-in">
          <PeriodSequencesPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Period Categories */}
      {currentRenderSection === "period-categories" && (
        <div className="w-full animate-fade-in">
          <PeriodCategoriesPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Staff Categories */}
      {currentRenderSection === "staff-categories" && (
        <div className="w-full animate-fade-in">
          <StaffCategoriesPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Staff Ranks & Designations */}
      {currentRenderSection === "staff-ranks" && (
        <div className="w-full animate-fade-in">
          <StaffRanksPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Curriculum Subjects */}
      {currentRenderSection === "academic-subjects" && (
        <div className="w-full animate-fade-in">
          <CurriculumSubjectsPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Universal Grading Policies */}
      {currentRenderSection === "grading-policies" && (
        <div className="w-full animate-fade-in">
          <GradingRulesView />
        </div>
      )}

      {/* Section 2: Working Hours & Shifts */}
      {currentRenderSection === "working-schedules" && (
        <div className="w-full animate-fade-in">
          <WorkingSchedulesPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section 2.5: Weekly Holidays & Weekend Schedule */}
      {currentRenderSection === "weekly-holidays" && (
        <div className="w-full animate-fade-in">
          <WeeklyHolidaySettingsPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section 2.6: Attendance Timing Policies */}
      {(currentRenderSection === "timing-rules" || currentRenderSection === "attendance-timing") && (
        <div className="w-full animate-fade-in">
          <AttendanceSettingsView isEmbedded={true} activeSectionOverride="timing-rules" />
        </div>
      )}

      {/* Section 2.7: Class Attendance Off Events */}
      {(currentRenderSection === "event-restrictions" || currentRenderSection === "attendance-off-events") && (
        <div className="w-full animate-fade-in">
          <AttendanceSettingsView isEmbedded={true} activeSectionOverride="event-restrictions" />
        </div>
      )}

      {/* Section 3: Schedule & Event Types */}
      {currentRenderSection === "event-types" && (
        <div className="w-full animate-fade-in">
          <EventTypesPanel activeTenantId={activeTenantId} eventKinds={eventKinds} />
        </div>
      )}

      {/* Section 3.5: System Impact Scopes */}
      {currentRenderSection === "impact-scopes" && (
        <div className="w-full animate-fade-in">
          <ImpactScopesPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Admission Policies & Field Controls */}
      {currentRenderSection === "admission-settings" && (
        <div className="w-full animate-fade-in">
          <AdmissionSettingsPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Document Titles & Types */}
      {currentRenderSection === "document-types" && (
        <div className="w-full animate-fade-in">
          <DocumentTypesPanel activeTenantId={activeTenantId} />
        </div>
      )}

      {/* Section: Class-Level Admission Requirements */}
      {currentRenderSection === "admission-doc-requirements" && (
        <div className="w-full animate-fade-in">
          <ClassAdmissionRequirementsPanel
            activeTenantId={activeTenantId}
            availableClassOptions={availableClassOptions}
            classesList={classesList}
            availableDocTitles={availableDocTitles}
          />
        </div>
      )}

      {/* Section: Staff Recruitment Document Rules */}
      {currentRenderSection === "staff-recruitment-rules" && (
        <div className="w-full animate-fade-in">
          <StaffRecruitmentRulesPanel
            activeTenantId={activeTenantId}
            availableDocTitles={availableDocTitles}
          />
        </div>
      )}

      {/* Section 4: Daily Progress Study Sessions */}
      {(currentRenderSection === "report-sessions" ||
        currentRenderSection === "study-sessions" ||
        currentRenderSection === "daily-study-sessions" ||
        currentRenderSection === "sessions") && (
        <div className="w-full animate-fade-in">
          <SessionManager />
        </div>
      )}

      {/* Section 4.1: Report Format & Teacher Tag (Merged) */}
      {(currentRenderSection === "classroom-report-format" ||
        currentRenderSection === "classroom-config" ||
        currentRenderSection === "classroom-teacher-tag" ||
        currentRenderSection === "classroom-date-format" ||
        currentRenderSection === "report-settings") && (
        <div className="w-full animate-fade-in">
          <ClassroomReportFormatView />
        </div>
      )}

      {/* Section 4.2: Classroom Date Timezone */}
      {(currentRenderSection === "classroom-date-timezone" ||
        currentRenderSection === "classroom-timezone") && (
        <div className="w-full animate-fade-in">
          <ClassroomTimezoneConfigView />
        </div>
      )}

      {/* Section 5: Trash & Restoration */}
      {currentRenderSection === "trash" && (
        <div className="w-full animate-fade-in">
          <TrashRestorationView />
        </div>
      )}

      {/* Section 5.5: Email Templates & Mailer Console */}
      {currentRenderSection === "email-templates" && (
        <div className="w-full animate-fade-in">
          <EmailTemplatesPreviewPanel />
        </div>
      )}

      {/* Section 5.8: Version Control & Releases Console */}
      {(currentRenderSection === "version-control" || currentRenderSection === "releases") && (
        <div className="w-full animate-fade-in">
          <ReleaseManagementView />
        </div>
      )}

      {/* Section 6: System & Environment */}
      {currentRenderSection === "system" && (
        <SystemEnvironmentPanel
          healthData={healthData}
          activeTenantId={activeTenantId}
          onRefreshHealth={onRefreshHealth}
          onClearCache={onClearCache}
        />
      )}
    </div>
  );
};


export const DeveloperToolsContentRenderer = InstitutionSettingsContentRenderer;
export type DeveloperToolsContentRendererProps = InstitutionSettingsContentRendererProps;
export default InstitutionSettingsContentRenderer;
