import React, { useState, useEffect, useCallback } from 'react';
import {
  TimerIcon,
  PlusIcon,
  BookOpenIcon,
} from '../../../components/ui/Icons';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import { PageContainer } from '../../../components/layout';
import { PeriodSlotsManagementView, PeriodSlotForm } from './periods';
import { CurriculumTrackerView, SyllabusDrawerForm } from './curriculum';
import {
  getPeriodSlots,
  deletePeriodSlot,
} from '../../../api/academy';
import { fetchWithAuth } from '../../../utils/authService';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { periodCategoriesStore, periodSequencesStore } from '../../../utils/localStore';

const TABS = [
  { id: 'periods', label: 'Daily Period Slots', icon: TimerIcon },
  { id: 'curriculum', label: 'Curriculum & Syllabus', icon: BookOpenIcon },
];

export default function RoutineCurriculumHubView({
  hideHeader = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const { activeTenant } = useTenant();
  const activeTenantId = activeTenant?.id || 'default';

  const [activeTab, setActiveTab] = useState('periods');
  const [periodSlots, setPeriodSlots] = useState([]);
  const [periodCategories, setPeriodCategories] = useState(() =>
    periodCategoriesStore.getCategories(activeTenantId)
  );
  const [periodSequences, setPeriodSequences] = useState(() =>
    periodSequencesStore.getSequences(activeTenantId)
  );

  useEffect(() => {
    const handleCategoriesUpdated = () => {
      setPeriodCategories(periodCategoriesStore.getCategories(activeTenantId));
    };
    const handleSequencesUpdated = () => {
      setPeriodSequences(periodSequencesStore.getSequences(activeTenantId));
    };

    window.addEventListener('spr_period_categories_updated', handleCategoriesUpdated);
    window.addEventListener('spr_period_sequences_updated', handleSequencesUpdated);

    return () => {
      window.removeEventListener('spr_period_categories_updated', handleCategoriesUpdated);
      window.removeEventListener('spr_period_sequences_updated', handleSequencesUpdated);
    };
  }, [activeTenantId]);

  const getCategoryLabel = useCallback((typeCode) => {
    const found = periodCategories.find((c) => c.code === typeCode || c.id === typeCode);
    return found ? (found.badge || found.name) : (typeCode ? typeCode.replace(/_/g, ' ') : 'Teaching Period');
  }, [periodCategories]);

  const getSequenceLabel = useCallback((orderNum) => {
    return periodSequencesStore.getLabelForOrder(activeTenantId, orderNum);
  }, [activeTenantId, periodSequences]);

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlot, setDeletingSlot] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadLookups = useCallback(async () => {
    try {
      const [deptRes, classRes, sectionRes, staffRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/departments/'),
        fetchWithAuth('/api/v1/classes/'),
        fetchWithAuth('/api/v1/academy/sections/'),
        fetchWithAuth('/api/v1/staff/'),
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
        const d = await deptRes.value.json();
        setDepartments(Array.isArray(d) ? d : d.results || []);
      }
      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (sectionRes.status === 'fulfilled' && sectionRes.value.ok) {
        const s = await sectionRes.value.json();
        setSections(Array.isArray(s) ? s : s.results || []);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const d = await staffRes.value.json();
        setTeachers(Array.isArray(d) ? d : d.results || []);
      }
    } catch {}
  }, []);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPeriodSlots();
      setPeriodSlots(Array.isArray(data) ? data : data.results || []);
    } catch {
      showToast('Failed to load period schedule slots.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadLookups();
    loadSlots();

    const handleUpdate = () => loadSlots();
    window.addEventListener('spr_period_slots_updated', handleUpdate);
    return () => window.removeEventListener('spr_period_slots_updated', handleUpdate);
  }, [loadLookups, loadSlots]);

  const { openDrawer, closeDrawer } = useRightSidebar();

  useDrawerRegistration(
    'period_slot',
    (params) => {
      const mode = params.get('mode') || 'add';
      const slotId = params.get('id');
      const foundSlot = slotId ? periodSlots.find((s) => String(s.id) === String(slotId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Period Slot' : 'Create Routine Period Slot',
        subtitle:
          mode === 'edit'
            ? `Update settings for ${foundSlot?.period_name || 'Period'}`
            : 'Configure daily lesson slots, break times, and routine timings',
        category: 'Routine & Timetable',
        size: 'lg',
        width: 'lg',
        content: (
          <PeriodSlotForm
            key={`period-slot-form-${mode}-${slotId || 'new'}`}
            editingSlot={foundSlot}
            existingSlots={periodSlots}
            onSaved={() => {
              loadSlots();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [periodSlots, loadSlots, closeDrawer]
  );

  useDrawerRegistration(
    'syllabus_form',
    () => ({
      title: 'Configure Course Syllabus',
      subtitle: 'Setup textbook target pages, assigned teachers, and academic terms',
      category: 'Curriculum & Syllabi',
      size: 'xl',
      width: 'xl',
      content: (
        <SyllabusDrawerForm
          activeTenantId={activeTenantId}
          departments={departments}
          classes={classes}
          sections={sections}
          teachers={teachers}
          periodSlots={periodSlots}
          onCancel={closeDrawer}
          onSaved={() => {
            closeDrawer();
            window.dispatchEvent(new CustomEvent('spr_curriculum_updated'));
          }}
        />
      ),
    }),
    [closeDrawer, activeTenantId, departments, classes, sections, teachers, periodSlots]
  );

  const handleOpenAddSlot = () => {
    openDrawer('period_slot', { mode: 'add' });
  };

  const handleOpenAddSyllabus = () => {
    openDrawer('syllabus_form');
  };

  const handleEditSlot = (slot) => {
    openDrawer('period_slot', { mode: 'edit', id: slot.id });
  };

  const handleDeleteSlot = (slot) => {
    setDeletingSlot(slot);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSlot?.id) return;
    setIsDeleting(true);
    try {
      await deletePeriodSlot(deletingSlot.id);
      showToast(`Period "${deletingSlot.period_name}" deleted successfully.`, 'success');
      setDeletingSlot(null);
      loadSlots();
    } catch {
      showToast('Failed to delete period slot.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer isEmbedded={isEmbedded} className="space-y-4">
      {/* 1. Header */}
      {!hideHeader && (
        <PageHeader
          title="Period Schedules & Curriculum Console"
          subtitle="Configure dynamic class period slots, break intervals, daily routines, and institutional kitab syllabi."
          icon={TimerIcon}
          actions={
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={activeTab === 'periods' ? handleOpenAddSlot : handleOpenAddSyllabus}
            >
              {activeTab === 'periods' ? 'Add Period' : 'Add Book'}
            </CustomButton>
          }
        />
      )}

      {/* 2. Tab Switcher */}
      <TabSwitcher
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 3. Tab 1: Daily Period Slots */}
      {activeTab === 'periods' && (
        <PeriodSlotsManagementView
          periodSlots={periodSlots}
          departments={departments}
          classes={classes}
          sections={sections}
          periodCategories={periodCategories}
          activeTenantId={activeTenantId}
          loading={loading}
          onOpenAddSlot={handleOpenAddSlot}
          onEditSlot={handleEditSlot}
          onDeleteSlot={handleDeleteSlot}
          deletingSlot={deletingSlot}
          isDeleting={isDeleting}
          onConfirmDelete={handleConfirmDelete}
          onCloseDeleteModal={() => !isDeleting && setDeletingSlot(null)}
          getSequenceLabel={getSequenceLabel}
          getCategoryLabel={getCategoryLabel}
        />
      )}

      {/* 4. Tab 2: Curriculum & Syllabus */}
      {activeTab === 'curriculum' && (
        <div className="animate-fade-in">
          <CurriculumTrackerView
            activeTenantId={activeTenantId}
            classes={classes}
            sections={sections}
            teachers={teachers}
            periodSlots={periodSlots}
            onOpenAddDrawer={handleOpenAddSyllabus}
          />
        </div>
      )}
    </PageContainer>
  );
}
