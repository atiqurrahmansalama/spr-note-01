import React from "react";
import CompactTaxonomyManager from "../../../components/common/CompactTaxonomyManager";
import { BookOpenIcon, ClockIcon, TimerIcon } from "../../../components/ui/Icons";
import {
  periodSequencesStore,
  periodCategoriesStore,
  academicSubjectsStore,
  ACADEMIC_SUBJECT_CATEGORIES,
} from "../../../utils/localStore";

export interface RoutineTaxonomyProps {
  activeTenantId?: string | null;
}

/**
 * Period Sequences & Number Ordering Taxonomy Panel
 */
export const PeriodSequencesPanel: React.FC<RoutineTaxonomyProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="Period Sequences &amp; Number Ordering"
      description="Configure daily timetable period sequences, ordinal labels (1st Period, 2nd Period, etc.), and slot rank orders used across Daily Period Slots and Lesson Delivery."
      fetchItems={async () => periodSequencesStore.getSequences(activeTenantId)}
      createItem={async (payload: any) => periodSequencesStore.addSequence(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => periodSequencesStore.updateSequence(activeTenantId, id, payload)}
      deleteItem={async (id: any) => periodSequencesStore.deleteSequence(activeTenantId, id)}
      itemTypeName="Period Sequence"
      icon={TimerIcon}
    />
  );
};

/**
 * Period Categories & Slot Types Taxonomy Panel
 */
export const PeriodCategoriesPanel: React.FC<RoutineTaxonomyProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="Period Categories &amp; Slot Types"
      description="Manage pre-configured lecture periods, break intervals, prayer sessions, and mutala routines available in Period Schedules and Timetables."
      fetchItems={async () => periodCategoriesStore.getCategories(activeTenantId)}
      createItem={async (payload: any) => periodCategoriesStore.addCategory(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => periodCategoriesStore.updateCategory(activeTenantId, id, payload)}
      deleteItem={async (id: any) => periodCategoriesStore.deleteCategory(activeTenantId, id)}
      itemTypeName="Period Category"
      icon={ClockIcon}
      extraFields={[
        {
          name: "affects_class_attendance",
          label: "Track in Class Attendance",
          type: "boolean",
          defaultValue: true,
          description: "Enable this if period slots with this category represent academic study / lectures that should appear in Student Class Attendance registers.",
          tableHeader: "Attendance Register",
          renderBadge: (val: any) => {
            const isEnabled = val !== false;
            return (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-2xs inline-flex items-center gap-1.5 ${
                  isEnabled
                    ? 'theme-bg-success-soft theme-success border-[var(--color-success-border)]'
                    : 'theme-bg-sub theme-text-secondary border-transparent'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                {isEnabled ? 'Tracked in Attendance' : 'Excluded from Attendance'}
              </span>
            );
          },
        },
      ]}
    />
  );
};

/**
 * Curriculum Subjects & Disciplines Taxonomy Panel
 */
export const CurriculumSubjectsPanel: React.FC<RoutineTaxonomyProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="Curriculum Subjects &amp; Disciplines"
      description="Manage institutional curriculum subjects, Islamic sciences (Fiqh, Hadith, Tafsir, Nahw, Sarf), and general textbooks (Bangla, English, Mathematics, Science) taught across classes."
      fetchItems={async () => academicSubjectsStore.getSubjects(activeTenantId)}
      createItem={async (payload: any) => academicSubjectsStore.addSubject(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => academicSubjectsStore.updateSubject(activeTenantId, id, payload)}
      deleteItem={async (id: any) => academicSubjectsStore.deleteSubject(activeTenantId, id)}
      typeOptions={ACADEMIC_SUBJECT_CATEGORIES}
      typeLabel="Subject Category"
      onManageTypes={true}
      itemTypeName="Academic Subject"
      hideStatus={true}
      icon={BookOpenIcon}
    />
  );
};
