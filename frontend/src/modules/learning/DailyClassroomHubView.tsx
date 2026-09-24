import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { CollapsiblePageHeader } from '@/components/ui';
import CustomButton from '@/components/ui/CustomButton';
import { PageContainer } from '@/components/layout';
import {
  BookOpenIcon,
  ChecklistIcon,
  PlusIcon,
  TrendingUpIcon,
} from '@/components/ui/Icons';
import { useAcademicData } from './hooks/useAcademicData';
import { useTenant } from '@/context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '@/context/RightSidebarContext';
import {
  LessonDeliveryManagementView,
  LessonPlanDrawer,
  LessonAnalyticsView,
  StudentAssessmentManagementView,
  StudentAssessmentDrawer,
  useDailyClassroomAssessment,
} from './lesson-management';
import useDailyClassroomData from './hooks/useDailyClassroomData';
import useDailyClassroomFilters from './hooks/useDailyClassroomFilters';
import { getClassroomTodayDate } from '@/constants/calendarConstants';
import { doesLessonMatchClass } from './utils/dailyClassroomUtils';
import HifzReportBuilderModule, { ProgressAnalyticsView, StudentReportsView } from './progress-management';

const LESSON_MANAGEMENT_TABS = [
  { id: 'LESSON', label: 'Daily Lessons', icon: BookOpenIcon, path: '/studies/daily-lessons' },
  { id: 'LESSON_ASSESSMENT', label: 'Lesson Assessments', icon: ChecklistIcon, path: '/studies/lesson-assessments' },
  { id: 'LESSON_ANALYTICS', label: 'Analytics', icon: TrendingUpIcon, path: '/studies/lesson-analytics' },
];

const PROGRESS_MANAGEMENT_TABS = [
  { id: 'PROGRESS', label: 'Daily Progress', icon: TrendingUpIcon, path: '/studies/daily-progress' },
  { id: 'PROGRESS_ASSESSMENT', label: 'Progress Reports', icon: ChecklistIcon, path: '/studies/progress-reports' },
  { id: 'PROGRESS_ANALYTICS', label: 'Analytics', icon: TrendingUpIcon, path: '/studies/progress-analytics' },
];

const normalizeTabId = (tab: string | null, isProgress: boolean) => {
  if (!tab) return isProgress ? 'PROGRESS' : 'LESSON';
  const upper = String(tab).toUpperCase();
  if (upper === 'ASSESSMENT' || upper === 'LESSON_ASSESSMENTS' || upper === 'RECITATIONS') {
    return 'LESSON_ASSESSMENT';
  }
  if (upper === 'LESSON_ANALYTICS') {
    return 'LESSON_ANALYTICS';
  }
  if (upper === 'PROGRESS_ANALYTICS') {
    return 'PROGRESS_ANALYTICS';
  }
  if (upper === 'ANALYTICS') {
    return isProgress ? 'PROGRESS_ANALYTICS' : 'LESSON_ANALYTICS';
  }
  if (
    upper === 'PROGRESS_ASSESSMENT' ||
    upper === 'PROGRESS_ASSESSMENTS' ||
    upper === 'PROGRESS_REPORTS' ||
    upper === 'STUDENT_REPORTS' ||
    upper === 'REPORTS'
  ) {
    return 'PROGRESS_ASSESSMENT';
  }
  if (isProgress && (upper === 'LESSON' || upper === 'LESSON_ASSESSMENT' || upper === 'LESSON_ANALYTICS')) {
    return 'PROGRESS';
  }
  if (!isProgress && (upper === 'PROGRESS' || upper === 'PROGRESS_ASSESSMENT' || upper === 'PROGRESS_ANALYTICS')) {
    return 'LESSON';
  }
  return upper;
};

export interface DailyClassroomHubViewProps {
  hideHeader?: boolean;
  isEmbedded?: boolean;
  hubType?: 'AUTO' | 'LESSON_MANAGEMENT' | 'PROGRESS_MANAGEMENT' | string;
  defaultTab?: string | null;
}

export default function DailyClassroomHubView({
  hideHeader = false,
  isEmbedded = false,
  hubType = 'AUTO',
  defaultTab = null,
}: DailyClassroomHubViewProps) {
  const { activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const tenantId = activeTenantId || 'default';

  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.toLowerCase();

  const isProgressHub = useMemo(() => {
    if (hubType === 'PROGRESS_MANAGEMENT') return true;
    if (hubType === 'LESSON_MANAGEMENT') return false;
    if (
      path.includes('/progress-management') ||
      path.includes('/daily-progress') ||
      path.includes('/progress-reports') ||
      path.includes('/progress-assessments') ||
      path.includes('/progress-analytics') ||
      defaultTab === 'PROGRESS' ||
      defaultTab === 'PROGRESS_ASSESSMENT' ||
      defaultTab === 'PROGRESS_ANALYTICS'
    ) {
      return true;
    }
    return false;
  }, [hubType, path, defaultTab]);

  const activeTabs = isProgressHub ? PROGRESS_MANAGEMENT_TABS : LESSON_MANAGEMENT_TABS;
  const hubTitle = isProgressHub ? 'Progress Management' : 'Lesson Management';
  const HubIcon = isProgressHub ? TrendingUpIcon : BookOpenIcon;

  const [searchParams] = useSearchParams();

  // ── Tab State Resolution ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(() => {
    const fromParam = searchParams.get('tab');
    if (fromParam) return normalizeTabId(fromParam, isProgressHub);
    if (defaultTab) return normalizeTabId(defaultTab, isProgressHub);

    if (isProgressHub) {
      if (path.includes('/progress-analytics')) return 'PROGRESS_ANALYTICS';
      if (path.includes('/progress-reports') || path.includes('/progress-assessments')) return 'PROGRESS_ASSESSMENT';
      return 'PROGRESS';
    } else {
      if (path.includes('/lesson-analytics')) return 'LESSON_ANALYTICS';
      if (path.includes('/lesson-assessments')) return 'LESSON_ASSESSMENT';
      return 'LESSON';
    }
  });

  // Sync tab on URL / Prop changes
  useEffect(() => {
    const fromParam = searchParams.get('tab');
    if (fromParam) {
      const normalized = normalizeTabId(fromParam, isProgressHub);
      setActiveTab((prev) => (prev !== normalized ? normalized : prev));
      return;
    }

    if (isProgressHub) {
      if (path.includes('/progress-analytics')) {
        setActiveTab((prev) => (prev !== 'PROGRESS_ANALYTICS' ? 'PROGRESS_ANALYTICS' : prev));
      } else if (path.includes('/progress-reports') || path.includes('/progress-assessments')) {
        setActiveTab((prev) => (prev !== 'PROGRESS_ASSESSMENT' ? 'PROGRESS_ASSESSMENT' : prev));
      } else if (path.includes('/daily-progress') || path.includes('/progress-management')) {
        setActiveTab((prev) => (prev !== 'PROGRESS' ? 'PROGRESS' : prev));
      } else if (defaultTab) {
        const normalized = normalizeTabId(defaultTab, isProgressHub);
        setActiveTab((prev) => (prev !== normalized ? normalized : prev));
      }
    } else {
      if (path.includes('/lesson-analytics')) {
        setActiveTab((prev) => (prev !== 'LESSON_ANALYTICS' ? 'LESSON_ANALYTICS' : prev));
      } else if (path.includes('/lesson-assessments')) {
        setActiveTab((prev) => (prev !== 'LESSON_ASSESSMENT' ? 'LESSON_ASSESSMENT' : prev));
      } else if (path.includes('/daily-lessons') || path.includes('/lesson-management')) {
        setActiveTab((prev) => (prev !== 'LESSON' ? 'LESSON' : prev));
      } else if (defaultTab) {
        const normalized = normalizeTabId(defaultTab, isProgressHub);
        setActiveTab((prev) => (prev !== normalized ? normalized : prev));
      }
    }
  }, [path, defaultTab, searchParams, isProgressHub]);

  // ── Global Academic Data ──────────────────────────────────────────────────────
  const {
    departments = [],
    classes = [],
    sections = [],
    students = [],
    periodSlots = [],
  } = useAcademicData() || {};

  // ── Persistent Filter Selection State ─────────────────────────────────────────
  const FILTER_STORAGE_KEY = `spr_daily_classroom_filters_${tenantId}_${isProgressHub ? 'progress' : 'lesson'}`;

  const [selectedDate, setSelectedDate] = useState(() => {
    const fromUrl = searchParams.get('date');
    if (fromUrl) return fromUrl;
    return getClassroomTodayDate();
  });

  const [selectedDepartmentId, setSelectedDepartmentId] = useState(() => {
    try {
      const fromUrl = searchParams.get('department');
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      return saved ? JSON.parse(saved).departmentId || '' : '';
    } catch {
      return '';
    }
  });

  const [selectedClassId, setSelectedClassId] = useState(() => {
    try {
      const fromUrl = searchParams.get('class');
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      return saved ? JSON.parse(saved).classId || '' : '';
    } catch {
      return '';
    }
  });

  const [selectedSectionId, setSelectedSectionId] = useState(() => {
    try {
      const fromUrl = searchParams.get('section');
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      return saved ? JSON.parse(saved).sectionId || '' : '';
    } catch {
      return '';
    }
  });
  const [activePeriodId, setActivePeriodId] = useState('1');

  // Persist filter selections to localStorage across page refreshes
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          departmentId: selectedDepartmentId || '',
          classId: selectedClassId || '',
          sectionId: selectedSectionId || '',
        })
      );
    } catch {}
  }, [selectedDepartmentId, selectedClassId, selectedSectionId, FILTER_STORAGE_KEY]);

  useEffect(() => {
    const handleTimezoneSettingsUpdate = () => {
      if (!searchParams.get('date')) {
        setSelectedDate(getClassroomTodayDate());
      }
    };

    window.addEventListener('spr_classroom_settings_updated', handleTimezoneSettingsUpdate);
    window.addEventListener('spr_calendar_settings_updated', handleTimezoneSettingsUpdate);
    window.addEventListener('spr_date_time_updated', handleTimezoneSettingsUpdate);
    return () => {
      window.removeEventListener('spr_classroom_settings_updated', handleTimezoneSettingsUpdate);
      window.removeEventListener('spr_calendar_settings_updated', handleTimezoneSettingsUpdate);
      window.removeEventListener('spr_date_time_updated', handleTimezoneSettingsUpdate);
    };
  }, [searchParams]);

  // ── Custom Hooks ─────────────────────────────────────────────────────────────
  const { lessons, evaluations, curriculumBooks, loadData } = useDailyClassroomData(tenantId, selectedDate);

  const {
    hasDepartments,
    departmentSelectOptions,
    classSelectOptions,
    selectedClassObj,
    hasSectionsForClass,
    sectionSelectOptions,
    allPeriodFilterOptions,
    baseFilteredLessons,
    filteredLessons,
    enrolledStudents,
    getSlotLessonsCount,
    getBookNamesForPeriod,
    getPeriodTimeForSlot,
  } = useDailyClassroomFilters({
    lessons,
    departments,
    classes,
    sections,
    students,
    periodSlots,
    curriculumBooks,
    selectedDate,
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    activePeriodId,
    setSelectedDepartmentId,
    setSelectedClassId,
    setSelectedSectionId,
    setActivePeriodId,
  });

  const effectiveClassId = selectedClassId;

  const { assessmentRows, assessmentMetrics, getSlotAssessmentCount } = useDailyClassroomAssessment({
    enrolledStudents,
    evaluations,
    lessons,
    classes,
    selectedDate,
    activePeriodId,
    filteredLessons,
    baseFilteredLessons,
  });

  // ── Lesson Metrics ────────────────────────────────────────────────────────────
  const lessonMetrics = useMemo(() => {
    const assignedCount = filteredLessons.filter((l) => l.is_assigned).length;
    const pendingCount = filteredLessons.filter((l) => !l.is_assigned).length;

    return [
      {
        label: 'Assigned Lessons',
        value: assignedCount,
        subValue: `Delivered for ${selectedDate || 'selected date'}`,
      },
      {
        label: 'Pending Routine Slots',
        value: pendingCount,
        subValue: `${filteredLessons.length} total scheduled slots`,
      },
      {
        label: 'Enrolled Classes',
        value: classes.length,
        subValue: 'Active divisions',
      },
      {
        label: 'Instructions Dispatched',
        value: filteredLessons.filter((l) => l.is_assigned && l.lesson_instructions).length,
        subValue: 'Guidelines attached',
      },
    ];
  }, [filteredLessons, classes, selectedDate]);

  // ── Tab Switching ────────────────────────────────────────────────────────────
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    let targetPath = '';
    if (isProgressHub) {
      if (tabId === 'PROGRESS_ANALYTICS') {
        targetPath = '/studies/progress-analytics';
      } else if (tabId === 'PROGRESS_ASSESSMENT') {
        targetPath = '/studies/progress-reports';
      } else {
        targetPath = '/studies/daily-progress';
      }
    } else {
      if (tabId === 'LESSON_ANALYTICS') {
        targetPath = '/studies/lesson-analytics';
      } else if (tabId === 'LESSON_ASSESSMENT') {
        targetPath = '/studies/lesson-assessments';
      } else {
        targetPath = '/studies/daily-lessons';
      }
    }

    const dateParam = searchParams.get('date');
    const query = dateParam ? `?date=${encodeURIComponent(dateParam)}` : '';
    navigate(`${targetPath}${query}`, { replace: true });
  };

  // ── Drawer Registrations ──────────────────────────────────────────────────────
  useDrawerRegistration(
    'lesson_plan',
    (params: URLSearchParams) => {
      const mode = params.get('mode') || 'add';
      const lessonId = mode === 'edit' || mode === 'duplicate' ? params.get('id') : null;
      const foundLesson = (mode === 'edit' || mode === 'duplicate') && lessonId
        ? lessons.find((l) => String(l.id) === String(lessonId))
        : null;

      let effectiveLesson = foundLesson;
      if (mode === 'duplicate' && foundLesson) {
        let nextStart = foundLesson.start_unit || '';
        let nextEnd = foundLesson.end_unit || '';
        const sNum = parseInt(foundLesson.start_unit, 10);
        const eNum = parseInt(foundLesson.end_unit, 10);
        if (!isNaN(sNum) && !isNaN(eNum) && eNum >= sNum) {
          const span = eNum - sNum + 1;
          nextStart = String(eNum + 1);
          nextEnd = String(eNum + span);
        }
        effectiveLesson = {
          ...foundLesson,
          id: '',
          start_unit: nextStart,
          end_unit: nextEnd,
          lesson_title: foundLesson.lesson_title ? `${foundLesson.lesson_title} (Copy)` : '',
        };
      }

      if (mode === 'add') {
        const pBookId = params.get('bookId') || '';
        const pBookName = params.get('bookName') || '';
        const pSubjectName = params.get('subjectName') || '';
        const pPeriodSlot = params.get('periodSlot') || '';
        const pPeriodName = params.get('periodName') || '';
        const pClassId = params.get('classId') || '';
        const pSectionId = params.get('sectionId') || '';
        const pTeacherName = params.get('teacherName') || '';
        const pTeacherId = params.get('teacherId') || '';

        if (pBookId || pBookName || pPeriodSlot || pClassId || pTeacherName) {
          effectiveLesson = {
            curriculum_book_id: pBookId,
            curriculum_book_name: pBookName,
            subject_name: pSubjectName,
            period_slot: pPeriodSlot,
            period_slot_id: pPeriodSlot,
            period_name: pPeriodName,
            academic_class: pClassId,
            academic_class_id: pClassId,
            section: pSectionId,
            section_id: pSectionId,
            teacher: pTeacherId,
            teacher_id: pTeacherId,
            teacher_name: pTeacherName,
            lesson_date: selectedDate,
          };
        }
      }

      const targetClassId =
        effectiveLesson?.academic_class_id ||
        effectiveLesson?.academic_class ||
        effectiveClassId || '';
      const targetSectionId =
        effectiveLesson?.section_id ||
        effectiveLesson?.section ||
        selectedSectionId || '';
      const targetPeriodId =
        effectiveLesson?.period_slot ||
        effectiveLesson?.period_slot_id ||
        activePeriodId || '1';
      const targetDeptId = selectedDepartmentId || '';

      return {
        title:
          mode === 'edit'
            ? 'Edit Lesson Plan & Assignment'
            : mode === 'duplicate'
            ? 'Duplicate Daily Sabaq & Lesson'
            : 'Assign Daily Sabaq & Lesson',
        subtitle:
          mode === 'edit'
            ? `Update details for ${foundLesson?.lesson_title || 'Lesson'}`
            : mode === 'duplicate'
            ? `Duplicating from ${foundLesson?.curriculum_book_name || 'Lesson'}`
            : 'Define homework, instruction milestones, and target page span',
        category: 'Academic Learning',
        size: 'md',
        width: 'md',
        content: (
          <LessonPlanDrawer
            key={`lesson-plan-drawer-${mode}-${lessonId || 'new'}-${targetDeptId}-${targetClassId}-${targetSectionId}-${targetPeriodId}-${selectedDate}-${effectiveLesson?.curriculum_book_id || 'none'}`}
            lesson={effectiveLesson}
            defaultDepartmentId={targetDeptId}
            defaultClassId={targetClassId}
            defaultSectionId={targetSectionId}
            defaultPeriodId={targetPeriodId}
            defaultDate={selectedDate}
            onSaveSuccess={() => { loadData(); closeDrawer(); }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [lessons, selectedDepartmentId, effectiveClassId, selectedSectionId, activePeriodId, selectedDate, loadData, closeDrawer]
  );

  useDrawerRegistration(
    'student_assessment',
    (params: URLSearchParams) => {
      const studentId = params.get('studentId') || '';
      const date = params.get('date') || selectedDate;
      const paramBookId = params.get('bookId') || '';
      const paramBookName = params.get('bookName') || '';
      const paramSubjectName = params.get('subjectName') || '';
      const paramLessonTitle = params.get('lessonTitle') || '';
      const paramStartUnit = params.get('startUnit') || '';
      const paramEndUnit = params.get('endUnit') || '';

      const foundStudent = (students || []).find((s: any) => String(s.id) === String(studentId));
      const foundEval = (evaluations || []).find((e: any) => String(e.student) === String(studentId) && e.evaluation_date === date);

      const stCls = foundStudent?.student_class !== undefined ? foundStudent.student_class : foundStudent?.class_id || (foundStudent as any)?.class;
      const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');
      const relevantLesson =
        filteredLessons.find((l) => doesLessonMatchClass(l, stClsId, classes)) ||
        baseFilteredLessons.find((l) => doesLessonMatchClass(l, stClsId, classes));

      const effectiveAssignedLesson =
        paramBookName || paramLessonTitle
          ? {
              curriculum_book_id: paramBookId || relevantLesson?.curriculum_book_id || '',
              curriculum_book_name: paramBookName || relevantLesson?.curriculum_book_name || '',
              subject_name: paramSubjectName || relevantLesson?.subject_name || '',
              lesson_title: paramLessonTitle || relevantLesson?.lesson_title || '',
              start_unit: paramStartUnit || (relevantLesson?.start_unit ? String(relevantLesson.start_unit) : ''),
              end_unit: paramEndUnit || (relevantLesson?.end_unit ? String(relevantLesson.end_unit) : ''),
            }
          : relevantLesson;

      return {
        title: foundEval ? 'Edit Student Assessment' : 'Evaluate Student Performance',
        subtitle: foundStudent
          ? `${foundStudent.name_en || foundStudent.name} (${foundStudent.uniq_id || foundStudent.roll_number || 'N/A'})`
          : 'Evaluate performance, mistakes, stucks, and lesson scores',
        category: 'Academic Learning',
        size: 'md',
        width: 'md',
        content: (
          <StudentAssessmentDrawer
            key={`assessment-drawer-${studentId}-${date}-${effectiveAssignedLesson?.curriculum_book_name || 'none'}-${effectiveAssignedLesson?.lesson_title || 'none'}`}
            studentId={studentId}
            date={date}
            evaluation={foundEval}
            assignedLesson={effectiveAssignedLesson}
            defaultDepartmentId={selectedDepartmentId || ''}
            defaultClassId={effectiveClassId || ''}
            defaultSectionId={selectedSectionId || ''}
            defaultPeriodId={activePeriodId || '1'}
            onSaveSuccess={() => { loadData(); closeDrawer(); }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [students, evaluations, filteredLessons, baseFilteredLessons, classes, departments, selectedDate, selectedDepartmentId, effectiveClassId, selectedSectionId, activePeriodId, loadData, closeDrawer]
  );

  // ── Action Handlers ───────────────────────────────────────────────────────────
  const handleOpenAddLesson = (rowDefaults: any = null) => {
    if (rowDefaults && typeof rowDefaults === 'object' && !rowDefaults.nativeEvent) {
      openDrawer('lesson_plan', {
        mode: 'add',
        bookId: rowDefaults.curriculum_book_id || '',
        bookName: rowDefaults.curriculum_book_name || '',
        subjectName: rowDefaults.subject_name || '',
        periodSlot: rowDefaults.period_slot || rowDefaults.period_slot_id || '',
        periodName: rowDefaults.period_name || '',
        classId: rowDefaults.academic_class_id || rowDefaults.academic_class || rowDefaults.class_id || effectiveClassId || '',
        sectionId: rowDefaults.section_id || rowDefaults.section || selectedSectionId || '',
        teacherId: rowDefaults.teacher_id || rowDefaults.teacher || '',
        teacherName: rowDefaults.teacher_name || '',
      });
    } else {
      openDrawer('lesson_plan', { mode: 'add' });
    }
  };

  const handleEditLesson = (lesson: any) => {
    if (!lesson) return;
    openDrawer('lesson_plan', {
      mode: 'edit',
      id: String(lesson.id),
      classId: lesson.academic_class_id || lesson.academic_class || lesson.class_id || effectiveClassId || '',
      sectionId: lesson.section_id || lesson.section || selectedSectionId || '',
    });
  };

  const handleDuplicateLesson = (lesson: any) => {
    if (!lesson) return;
    openDrawer('lesson_plan', {
      mode: 'duplicate',
      id: String(lesson.id),
      classId: lesson.academic_class_id || lesson.academic_class || lesson.class_id || effectiveClassId || '',
      sectionId: lesson.section_id || lesson.section || selectedSectionId || '',
    });
  };

  const handleOpenAssessmentDrawer = (studentId: string | number, rowData: any = null) => {
    openDrawer('student_assessment', {
      studentId: String(studentId || ''),
      date: selectedDate,
      classId: effectiveClassId || '',
      sectionId: selectedSectionId || '',
      periodId: activePeriodId || '1',
      bookId: rowData?.curriculum_book_id || '',
      bookName: rowData?.curriculum_book_name || '',
      subjectName: rowData?.subject_name || '',
      lessonTitle: rowData?.lesson_title || rowData?.lesson_covered || '',
      startUnit: rowData?.start_unit ? String(rowData.start_unit) : '',
      endUnit: rowData?.end_unit ? String(rowData.end_unit) : '',
    });
  };

  const sharedFilterProps = useMemo(() => ({
    showDate: true,
    dateLabel: isProgressHub ? 'Progress Date' : 'Delivery Date',
    selectedDate,
    onDateChange: (newDate: string) => {
      setSelectedDate(newDate);
      const params = new URLSearchParams(searchParams);
      if (newDate) {
        params.set('date', newDate);
      } else {
        params.delete('date');
      }
      navigate(`?${params.toString()}`, { replace: true });
    },
    hasDepartments,
    selectedDepartmentId,
    onDepartmentChange: (val: any) => {
      setSelectedDepartmentId(val);
      setSelectedClassId('');
      setSelectedSectionId('');
    },
    departmentSelectOptions,
    selectedClassId,
    onClassChange: (val: any) => {
      setSelectedClassId(val);
      setSelectedSectionId('');
    },
    classSelectOptions,
    hasSectionsForClass,
    selectedSectionId,
    onSectionChange: setSelectedSectionId,
    sectionSelectOptions,
    showPeriodSwitcher: true,
    allPeriodFilterOptions,
    activePeriodId,
    onPeriodChange: setActivePeriodId,
    getPeriodSubtitle: getPeriodTimeForSlot,
  }), [
    isProgressHub,
    selectedDate,
    searchParams,
    navigate,
    hasDepartments,
    selectedDepartmentId,
    departmentSelectOptions,
    selectedClassId,
    classSelectOptions,
    hasSectionsForClass,
    selectedSectionId,
    sectionSelectOptions,
    allPeriodFilterOptions,
    activePeriodId,
    getPeriodTimeForSlot,
  ]);

  return (
    <PageContainer isEmbedded={isEmbedded} className="space-y-4">
      {/* 1. Collapsible Header & Tab Switcher */}
      <CollapsiblePageHeader
        hideHeader={hideHeader}
        title={hubTitle}
        icon={HubIcon}
        storageKey={isProgressHub ? 'progress_management_header' : 'lesson_management_header'}
        tabs={activeTabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        actionsPlacement="tabs"
        actions={
          !isProgressHub && activeTab === 'LESSON' ? (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={handleOpenAddLesson}
            >
              Add Lesson
            </CustomButton>
          ) : !isProgressHub && (activeTab === 'LESSON_ASSESSMENT' || activeTab === 'ASSESSMENT') ? (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={() => handleOpenAssessmentDrawer('')}
            >
              Evaluate Student
            </CustomButton>
          ) : null
        }
      />

      {/* Lesson Management — Tab 1: Daily Lessons */}
      {!isProgressHub && activeTab === 'LESSON' && (
        <LessonDeliveryManagementView
          filterProps={sharedFilterProps}
          filteredLessons={filteredLessons}
          lessonMetrics={lessonMetrics}
          getSlotLessonsCount={getSlotLessonsCount}
          getBookNamesForPeriod={getBookNamesForPeriod}
          selectedClassObj={selectedClassObj}
          classes={classes}
          tenantId={tenantId}
          loadData={loadData}
          onOpenAddLesson={handleOpenAddLesson}
          onEditLesson={handleEditLesson}
          onDuplicateLesson={handleDuplicateLesson}
        />
      )}

      {/* Lesson Management — Tab 2: Lesson Assessments */}
      {!isProgressHub && (activeTab === 'LESSON_ASSESSMENT' || activeTab === 'ASSESSMENT') && (
        <StudentAssessmentManagementView
          filterProps={sharedFilterProps}
          assessmentRows={assessmentRows}
          assessmentMetrics={assessmentMetrics}
          getSlotAssessmentCount={getSlotAssessmentCount}
          onOpenAssessmentDrawer={handleOpenAssessmentDrawer}
          tenantId={tenantId}
          loadData={loadData}
        />
      )}

      {/* Lesson Management — Tab 3: Analytics */}
      {!isProgressHub && activeTab === 'LESSON_ANALYTICS' && (
        <LessonAnalyticsView
          filterProps={sharedFilterProps}
          filteredLessons={filteredLessons}
          baseFilteredLessons={baseFilteredLessons}
          lessons={lessons}
          evaluations={evaluations}
          assessmentRows={assessmentRows}
          assessmentMetrics={assessmentMetrics}
          enrolledStudents={enrolledStudents}
          periodSlots={periodSlots}
          getSlotLessonsCount={getSlotLessonsCount}
          classes={classes}
          tenantId={tenantId}
          loadData={loadData}
        />
      )}

      {/* Progress Management — Tab 1: Daily Progress */}
      {isProgressHub && activeTab === 'PROGRESS' && (
        <div className="w-full pt-1">
          <HifzReportBuilderModule filterProps={sharedFilterProps} isEmbedded={true} />
        </div>
      )}

      {/* Progress Management — Tab 2: Progress Assessments (Student Reports) */}
      {isProgressHub && (activeTab === 'PROGRESS_ASSESSMENT' || activeTab === 'PROGRESS_ASSESSMENTS') && (
        <div className="w-full pt-1">
          <StudentReportsView isEmbedded={true} />
        </div>
      )}

      {/* Progress Management — Tab 3: Analytics */}
      {isProgressHub && activeTab === 'PROGRESS_ANALYTICS' && (
        <div className="w-full pt-1">
          <ProgressAnalyticsView filterProps={sharedFilterProps} isEmbedded={true} />
        </div>
      )}
    </PageContainer>
  );
}

export { DailyClassroomHubView as LearningHubView };
