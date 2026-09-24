import React from "react";
import { SessionsIcon } from "../../../components/ui/Icons";
import { HealthDiagnosticsResponse } from "./types";

// Domain Feature Components
import { AcademyCategoriesPanel, BranchCategoriesPanel } from "../../academy/campus-structure/AcademyStructureTaxonomyPanels";
import { PeriodSequencesPanel, PeriodCategoriesPanel, CurriculumSubjectsPanel } from "../../academy/routine-curriculum/RoutineTaxonomyPanels";
import { StaffRanksPanel, StaffRecruitmentRulesPanel } from "../../staff-management/StaffTaxonomyPanels";
import {
  WorkingSchedulesPanel,
  EventTypesPanel,
  ImpactScopesPanel,
} from "../../academy/calendar-events/CalendarSchedulesTaxonomyPanels";
import WeeklyHolidaySettingsPanel from "../../academy/calendar-events/WeeklyHolidaySettingsPanel";
import { AdmissionSettingsPanel } from "../../student-management/admission/AdmissionSettingsPanel";
import {
  DocumentTypesPanel,
  ClassAdmissionRequirementsPanel,
} from "../../student-management/admission/AdmissionTaxonomyPanels";
import GradingRulesView from "../../examinations/grading-rules/GradingRulesView";
import SessionManager from "../../student-management/sessions/SessionManager";
import ClassroomConfigurationView from "../../learning/components/ClassroomConfigurationView";
import TrashRestorationView from "../../admin/TrashRestorationView";
import { SystemEnvironmentPanel } from "./SystemEnvironmentPanel";


export interface DeveloperToolsContentRendererProps {
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
export const DeveloperToolsContentRenderer: React.FC<DeveloperToolsContentRendererProps> = ({
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
      {/* Section 1: Academy & Branch Categories */}
      {currentRenderSection === "categories" && (
        <div className="space-y-8 animate-fade-in">
          <AcademyCategoriesPanel />
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

      {/* Section 4: Daily Session Progress Topics */}
      {currentRenderSection === "report-sessions" && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-1">
            <h3 className="text-sm sm:text-base font-bold theme-text-primary flex items-center gap-2">
              <SessionsIcon className="w-4 h-4 theme-accent" />
              <span>Daily Classroom Sessions &amp; Progress Topics</span>
            </h3>
            <p className="text-xs theme-text-secondary">
              Configure classroom tracking session tags (Sabaq, Saat Sabaq, Amukta, Nazira, Revision, Quran Tracker).
            </p>
          </div>
          <SessionManager />
        </div>
      )}

      {/* Section 4.5: Classroom Configuration & Defaults */}
      {(currentRenderSection === "classroom-config" || currentRenderSection === "report-settings") && (
        <div className="w-full animate-fade-in">
          <ClassroomConfigurationView />
        </div>
      )}

      {/* Section 5: Trash & Restoration */}
      {currentRenderSection === "trash" && (
        <div className="w-full animate-fade-in">
          <TrashRestorationView />
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
