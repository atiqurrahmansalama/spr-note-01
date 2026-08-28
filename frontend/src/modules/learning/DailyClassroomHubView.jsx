import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import TabSwitcher from '../../components/ui/TabSwitcher';
import { PageContainer } from '../../components/layout';
import UniversalManagementView from '../../components/common/UniversalManagementView';
import CustomSelect from '../../components/ui/CustomSelect';
import ReusableCalendar from '../../components/common/ReusableCalendar';
import ActionMenu from '../../components/ui/ActionMenu';
import {
  BookOpenIcon,
  ChecklistIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
  EyeIcon,
  TimerIcon,
} from '../../components/ui/Icons';
import { learningStore } from '../../utils/stores/learningStore';
import {
  curriculumStore,
  periodSequencesStore,
  getOrdinalPeriodLabel,
} from '../../utils/localStore';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import { useAcademicData } from './useAcademicData';
import LessonPlanDrawer from './LessonPlanDrawer';
import HomeworkDrawer from './HomeworkDrawer';
import StudentAssessmentDrawer from './StudentAssessmentDrawer';
import StudentDiaryFeedCard from './StudentDiaryFeedCard';

const TABS = [
  { id: 'LESSONS', label: 'Lesson Delivery & Classwork', icon: BookOpenIcon },
  { id: 'ASSESSMENT', label: 'Daily Student Assessment', icon: ChecklistIcon },
  { id: 'HOMEWORK', label: 'Homework & Tasks', icon: ClipboardDocumentCheckIcon },
];

export default function DailyClassroomHubView({ defaultTab = 'LESSONS' }) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes, sections, students, periodSlots } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const activeTabParam = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(activeTabParam);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  // ─── Data States ─────────────────────────────────────────────────────────────
  const [lessons, setLessons] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [curriculumBooks, setCurriculumBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Common Date, Class & Period Filters
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');
  const [selectedPeriodId, setSelectedPeriodId] = useState('ALL');

  // Search Queries
  const [lessonSearch, setLessonSearch] = useState('');
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [hwSearch, setHwSearch] = useState('');

  const loadData = () => {
    try {
      const allLessons = learningStore.getDailyLessons(tenantId);
      const allEvals = learningStore.getEvaluations(tenantId);
      const allHws = learningStore.getHomeworks(tenantId);
      const allBooks = curriculumStore.getItems(tenantId);

      setLessons(allLessons);
      setEvaluations(allEvals);
      setHomeworks(allHws);
      setCurriculumBooks(allBooks);
    } catch (err) {
      console.error('Failed to load daily classroom data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('spr_learning_updated', handleUpdate);
    window.addEventListener('spr_curriculum_updated', handleUpdate);
    window.addEventListener('spr_curriculum_kitabs_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_learning_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_kitabs_updated', handleUpdate);
    };
  }, [tenantId]);

  // Enrolled Students
  const enrolledStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClassId === 'ALL' || String(s.student_class) === String(selectedClassId);
      const matchSection = selectedSectionId === 'ALL' || String(s.section) === String(selectedSectionId);
      return matchClass && matchSection;
    });
  }, [students, selectedClassId, selectedSectionId]);

  // ─── Register Right Sidebar Drawers ─────────────────────────────────────────

  useDrawerRegistration('lesson_plan', (params) => {
    const mode = params.get('mode') || 'add';
    const lessonId = params.get('id');
    const periodIdParam = params.get('periodId') || (selectedPeriodId !== 'ALL' ? selectedPeriodId : '');
    const bookIdParam = params.get('bookId') || '';
    const dateParam = params.get('date') || selectedDate;
    const found = lessonId ? lessons.find((l) => String(l.id) === String(lessonId)) : null;

    return {
      title: mode === 'add' ? 'Assign Daily Sabaq & Lesson' : `Edit: ${found?.lesson_title || 'Daily Lesson'}`,
      category: 'Academic Classroom',
      size: 'md',
      content: (
        <LessonPlanDrawer
          lesson={found}
          defaultClassId={selectedClassId !== 'ALL' ? selectedClassId : ''}
          defaultPeriodId={found?.period_slot || periodIdParam}
          defaultBookId={bookIdParam}
          defaultDate={dateParam}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  useDrawerRegistration('homework_task', (params) => {
    const mode = params.get('mode') || 'add';
    const hwId = params.get('id');
    const found = hwId ? homeworks.find((h) => String(h.id) === String(hwId)) : null;

    return {
      title: mode === 'add' ? 'Assign Homework & Tasks' : `Edit: ${found?.title || 'Homework'}`,
      category: 'Academic Classroom',
      size: 'md',
      content: (
        <HomeworkDrawer
          homework={found}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  useDrawerRegistration('student_assessment', (params) => {
    const studentIdParam = params.get('studentId') || '';
    const dateParam = params.get('date') || selectedDate;
    const foundStudent = students.find((s) => String(s.id) === String(studentIdParam));

    return {
      title: foundStudent
        ? `Assessment: ${foundStudent.name_en || foundStudent.name}`
        : 'Daily Student Assessment & Evaluation',
      category: 'Academic Classroom',
      size: 'md',
      content: (
        <StudentAssessmentDrawer
          studentId={studentIdParam}
          date={dateParam}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  useDrawerRegistration('student_diary_feed', () => {
    const currentEvals = evaluations.filter((e) => e.evaluation_date === selectedDate);
    return {
      title: `Daily Student Diary: ${selectedDate}`,
      category: 'Academic Classroom',
      size: 'md',
      content: (
        <div className="p-4 sm:p-6 space-y-4">
          <StudentDiaryFeedCard
            date={selectedDate}
            lessons={filteredLessons}
            evaluations={currentEvals}
            homeworks={filteredHomeworks}
          />
          <div className="pt-4 border-t theme-border flex justify-end">
            <button
              type="button"
              onClick={closeDrawer}
              className="px-4 py-2 text-xs font-semibold theme-bg-sub border theme-border rounded-xl theme-text-primary hover:theme-bg-elevated cursor-pointer transition"
            >
              Close Feed
            </button>
          </div>
        </div>
      ),
    };
  });

  // ─── Filtered Collections ──────────────────────────────────────────────────

  // Filter period slots by currently selected Class and sort by period_order
  const classFilteredPeriods = useMemo(() => {
    let list = periodSlots;
    if (selectedClassId !== 'ALL') {
      list = periodSlots.filter((p) => {
        if (!p.student_class && !p.class_id && !p.class) return true;
        const pClsId = typeof p.student_class === 'object' ? p.student_class?.id : p.student_class || p.class_id || p.class;
        return String(pClsId) === String(selectedClassId);
      });
    }
    return [...list].sort((a, b) => (Number(a.period_order) || 99) - (Number(b.period_order) || 99));
  }, [periodSlots, selectedClassId]);

  // Auto-reset selected period if it is no longer valid under the selected class
  useEffect(() => {
    if (selectedPeriodId !== 'ALL') {
      const isStillValid = classFilteredPeriods.some((p) => String(p.id) === String(selectedPeriodId));
      if (!isStillValid) {
        setSelectedPeriodId('ALL');
      }
    }
  }, [classFilteredPeriods, selectedPeriodId]);

  // Count assigned lessons per period for selected date & class
  const periodLessonCounts = useMemo(() => {
    const counts = {};
    lessons.forEach((l) => {
      const matchClass = selectedClassId === 'ALL' || String(l.academic_class) === String(selectedClassId);
      const matchDate = !selectedDate || l.lesson_date === selectedDate;
      if (matchClass && matchDate) {
        if (l.period_slot) {
          counts[l.period_slot] = (counts[l.period_slot] || 0) + 1;
        }
      }
    });
    return counts;
  }, [lessons, selectedClassId, selectedDate]);

  const totalClassLessonsCount = useMemo(() => {
    return lessons.filter((l) => {
      const matchClass = selectedClassId === 'ALL' || String(l.academic_class) === String(selectedClassId);
      const matchDate = !selectedDate || l.lesson_date === selectedDate;
      return matchClass && matchDate;
    }).length;
  }, [lessons, selectedClassId, selectedDate]);

  // 1. Lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const matchSearch =
        lessonSearch === '' ||
        (l.lesson_title || '').toLowerCase().includes(lessonSearch.toLowerCase()) ||
        (l.subject_name || '').toLowerCase().includes(lessonSearch.toLowerCase()) ||
        (l.curriculum_book_name || '').toLowerCase().includes(lessonSearch.toLowerCase()) ||
        (l.teacher_name || '').toLowerCase().includes(lessonSearch.toLowerCase()) ||
        (l.period_name || '').toLowerCase().includes(lessonSearch.toLowerCase());

      const matchClass = selectedClassId === 'ALL' || String(l.academic_class) === String(selectedClassId);
      const matchDate = !selectedDate || l.lesson_date === selectedDate;
      const matchPeriod = selectedPeriodId === 'ALL' || String(l.period_slot) === String(selectedPeriodId);
      return matchSearch && matchClass && matchDate && matchPeriod;
    });
  }, [lessons, lessonSearch, selectedClassId, selectedDate, selectedPeriodId]);

  // 1.1. Curriculum Books Linked to Active Class
  const classCurriculumBooks = useMemo(() => {
    return curriculumBooks.filter((b) => {
      if (selectedClassId === 'ALL') return true;
      return !b.classId || String(b.classId) === String(selectedClassId);
    });
  }, [curriculumBooks, selectedClassId]);

  const getBookNameForPeriod = useCallback((period) => {
    if (!period) return 'No Book Assigned';
    const periodIdStr = String(period.id || '');
    const periodOrderStr = String(period.period_order || '');
    const periodNameStr = (period.period_name || '').toLowerCase();
    const periodOrdinalStr = getOrdinalPeriodLabel(period.period_order || 1).toLowerCase();

    // 1. Match books in active class curriculum by exact periodSlotId
    let matches = classCurriculumBooks.filter((b) => {
      if (b.periodSlotId && String(b.periodSlotId) === periodIdStr) return true;
      if (b.period_slot && String(b.period_slot) === periodIdStr) return true;
      return false;
    });

    // 2. Match by period_order or period name prefix if slot ID is dynamic
    if (matches.length === 0) {
      matches = classCurriculumBooks.filter((b) => {
        if (b.period_order && String(b.period_order) === periodOrderStr) return true;
        if (b.periodName && (
          b.periodName.toLowerCase().includes(periodOrdinalStr) ||
          b.periodName.toLowerCase().startsWith(`${periodOrderStr}st`) ||
          b.periodName.toLowerCase().startsWith(`${periodOrderStr}nd`) ||
          b.periodName.toLowerCase().startsWith(`${periodOrderStr}rd`) ||
          b.periodName.toLowerCase().startsWith(`${periodOrderStr}th`) ||
          (periodNameStr && b.periodName.toLowerCase() === periodNameStr)
        )) return true;
        return false;
      });
    }

    // 3. Fallback: match from lessons if a lesson was assigned for this period
    if (matches.length === 0) {
      const periodLesson = lessons.find((l) =>
        (String(l.period_slot) === periodIdStr || String(l.period_order) === periodOrderStr) &&
        (l.curriculum_book_name || l.book_name || l.subject_name)
      );
      if (periodLesson) {
        return periodLesson.curriculum_book_name || periodLesson.book_name || periodLesson.subject_name;
      }
    }

    if (matches.length > 0) {
      return matches.map((b) => b.name).join(', ');
    }

    return 'No Book Assigned';
  }, [classCurriculumBooks, lessons]);

  // 2. Clean Read-Only Assessment Rows
  const assessmentRows = useMemo(() => {
    return enrolledStudents.filter((st) => {
      const name = (st.name_en || st.name || '').toLowerCase();
      const id = (st.uniq_id || st.roll_number || '').toLowerCase();
      return assessmentSearch === '' || name.includes(assessmentSearch.toLowerCase()) || id.includes(assessmentSearch.toLowerCase());
    }).map((st) => {
      const existing = evaluations.find(
        (e) => String(e.student) === String(st.id) && e.evaluation_date === selectedDate
      );

      return {
        id: st.id,
        student: st.id,
        student_name: st.name_en || st.name || 'Student',
        student_uniq_id: st.uniq_id || st.roll_number || 'N/A',
        student_class_name: st.student_class_name || 'Standard Division',
        evaluation_date: selectedDate,
        is_evaluated: Boolean(existing),
        evaluation_status: existing?.evaluation_status || 'NOT_EVALUATED',
        subject_name: existing?.subject_name || '—',
        lesson_covered: existing?.lesson_covered || '',
        start_unit: existing?.start_unit || '',
        end_unit: existing?.end_unit || '',
        score: existing?.score !== undefined ? existing.score : '—',
        total_mistakes: existing?.total_mistakes || 0,
        total_stucks: existing?.total_stucks || 0,
        fluency_rating: existing?.fluency_rating || '—',
        teacher_remarks: existing?.teacher_remarks || '—',
      };
    });
  }, [enrolledStudents, assessmentSearch, evaluations, selectedDate]);

  // 3. Homework
  const filteredHomeworks = useMemo(() => {
    return homeworks.filter((h) => {
      const matchSearch =
        hwSearch === '' ||
        (h.title || '').toLowerCase().includes(hwSearch.toLowerCase()) ||
        (h.subject_name || '').toLowerCase().includes(hwSearch.toLowerCase()) ||
        (h.teacher_name || '').toLowerCase().includes(hwSearch.toLowerCase());

      const matchClass = selectedClassId === 'ALL' || String(h.academic_class) === String(selectedClassId);
      return matchSearch && matchClass;
    });
  }, [homeworks, hwSearch, selectedClassId]);

  // ─── Metrics ───────────────────────────────────────────────────────────────

  const activePeriodsCount = useMemo(() => {
    const pSet = new Set(filteredLessons.map((l) => l.period_slot || l.period_name).filter(Boolean));
    return pSet.size;
  }, [filteredLessons]);

  const lessonMetrics = useMemo(() => [
    { label: 'Assigned Lessons', value: filteredLessons.length, subValue: 'Delivered for selected date & period' },
    { label: 'Active Periods', value: activePeriodsCount || filteredLessons.length, subValue: 'Routine slots utilized' },
    { label: 'Enrolled Classes', value: classes.length, subValue: 'Active divisions' },
    { label: 'Instructions Dispatched', value: filteredLessons.filter((l) => l.lesson_instructions).length, subValue: 'Guidelines attached' },
  ], [filteredLessons, activePeriodsCount, classes]);

  const assessmentMetrics = useMemo(() => {
    const evaluated = assessmentRows.filter((r) => r.is_evaluated && r.evaluation_status !== 'ABSENT').length;
    const mistakes = assessmentRows.reduce((acc, r) => acc + (Number(r.total_mistakes) || 0), 0);
    const stucks = assessmentRows.reduce((acc, r) => acc + (Number(r.total_stucks) || 0), 0);
    return [
      { label: 'Enrolled Students', value: enrolledStudents.length, subValue: 'Class roster count' },
      { label: 'Assessed Today', value: evaluated, subValue: 'Evaluated recitations' },
      { label: 'Total Mistakes', value: mistakes, subValue: 'Errors flagged' },
      { label: 'Total Stucks', value: stucks, subValue: 'Lukmah occurrences' },
    ];
  }, [assessmentRows, enrolledStudents]);

  const homeworkMetrics = useMemo(() => [
    { label: 'Active Tasks', value: filteredHomeworks.length, subValue: 'Published assignments' },
    { label: 'Written Exercises', value: filteredHomeworks.filter((h) => h.submission_type === 'WRITTEN_TEXT').length, subValue: 'Diary notes' },
    { label: 'Verbal Practice', value: filteredHomeworks.filter((h) => h.submission_type === 'VERBAL_RECITATION').length, subValue: 'Recitation tasks' },
    { label: 'Guardian Sync', value: 'Live Feed', subValue: 'Student portal synchronization' },
  ], [filteredHomeworks]);

  const classSelectOptions = useMemo(() => [
    { value: 'ALL', label: 'All Classes' },
    ...classes.map((c) => ({ value: String(c.id), label: c.name || 'Class' })),
  ], [classes]);

  // Dedicated class options for Lesson Delivery tab (without "All Classes")
  const lessonClassSelectOptions = useMemo(() => [
    ...classes.map((c) => ({ value: String(c.id), label: c.name || 'Class' })),
  ], [classes]);

  // Ensure LESSONS tab always has a specific class selected
  useEffect(() => {
    if (activeTab === 'LESSONS' && selectedClassId === 'ALL' && classes.length > 0) {
      setSelectedClassId(String(classes[0].id));
    }
  }, [activeTab, selectedClassId, classes]);

  const filteredSectionList = sections.filter((s) => selectedClassId === 'ALL' || String(s.student_class) === String(selectedClassId));
  const sectionSelectOptions = [
    { value: 'ALL', label: 'All Sections' },
    ...filteredSectionList.map((s) => ({ value: String(s.id), label: s.section_name || 'Section' })),
  ];

  // Columns for Lessons
  const lessonColumns = [
    {
      header: 'Curriculum Book & Lesson',
      render: (row) => (
        <div className="space-y-0.5 min-w-[200px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {row.curriculum_book_name ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md theme-bg-accent/10 theme-text-accent inline-flex items-center gap-1">
                <BookOpenIcon className="w-3 h-3 shrink-0" />
                {row.curriculum_book_name}
              </span>
            ) : null}
            <span className="text-[11px] font-medium theme-text-secondary">
              {row.subject_name || 'General'}
            </span>
          </div>
          <span className="font-bold theme-text-primary block text-xs sm:text-sm">
            {row.lesson_title}
          </span>
          {row.lesson_topic && (
            <span className="text-[11px] theme-text-secondary line-clamp-1">
              {row.lesson_topic}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Class Period & Time',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold theme-text-primary px-2.5 py-1 rounded-md border theme-border theme-bg-secondary/40 inline-flex items-center gap-1.5">
            <TimerIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <span className="truncate max-w-[180px]">
              {row.period_name || (row.period_order ? `Period ${row.period_order}` : 'General Slot')}
            </span>
          </span>
          {row.period_time && (
            <span className="text-[11px] theme-text-secondary block mt-0.5 ml-1">
              {row.period_time}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Target Class / Section',
      render: (row) => (
        <div>
          <span className="font-medium theme-text-primary block">{row.class_name}</span>
          <span className="text-xs theme-text-secondary">{row.section_name || 'All Sections'}</span>
        </div>
      ),
    },
    {
      header: 'Assigned Range',
      render: (row) => (
        <span className="text-xs font-semibold theme-text-primary px-2.5 py-1 rounded-md border theme-border theme-bg-secondary/40">
          {row.start_unit || 'Start'} → {row.end_unit || 'End'}
        </span>
      ),
    },
    {
      header: 'Instructor',
      render: (row) => (
        <span className="text-xs font-medium theme-text-primary">{row.teacher_name || 'Assigned Instructor'}</span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (row) => {
        const actionItems = [
          {
            label: 'Edit Lesson',
            icon: EditIcon,
            onClick: () => {
              openDrawer('lesson_plan', { mode: 'edit', id: row.id });
            },
          },
          {
            label: 'Delete Lesson',
            icon: DeleteIcon,
            variant: 'danger',
            onClick: () => {
              if (window.confirm('Delete this lesson assignment?')) {
                learningStore.deleteDailyLesson(tenantId, row.id);
                showToast({ type: 'success', message: 'Lesson deleted.' });
                loadData();
              }
            },
          },
        ];
        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ];

  // Render Lesson Card for Grid View
  const renderLessonCard = (row) => {
    const actionItems = [
      {
        label: 'Edit Lesson',
        icon: EditIcon,
        onClick: () => {
          openDrawer('lesson_plan', { mode: 'edit', id: row.id });
        },
      },
      {
        label: 'Delete Lesson',
        icon: DeleteIcon,
        variant: 'danger',
        onClick: () => {
          if (window.confirm('Delete this lesson assignment?')) {
            learningStore.deleteDailyLesson(tenantId, row.id);
            showToast({ type: 'success', message: 'Lesson deleted.' });
            loadData();
          }
        },
      },
    ];

    return (
      <div
        key={row.id}
        className="rounded-2xl border theme-border theme-bg-primary p-4 sm:p-5 flex flex-col justify-between space-y-3.5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {row.curriculum_book_name && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md theme-bg-accent/10 theme-text-accent inline-flex items-center gap-1">
                  <BookOpenIcon className="w-3 h-3 shrink-0" />
                  {row.curriculum_book_name}
                </span>
              )}
              {row.period_name && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border theme-border theme-bg-secondary/40 theme-text-primary inline-flex items-center gap-1">
                  <TimerIcon className="w-3 h-3 theme-accent shrink-0" />
                  {row.period_name}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold theme-text-primary mt-1 truncate">{row.lesson_title}</h4>
            {row.lesson_topic && (
              <p className="text-xs theme-text-secondary line-clamp-1">{row.lesson_topic}</p>
            )}
          </div>
          <ActionMenu items={actionItems} align="right" />
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border theme-border theme-bg-secondary/20 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold theme-text-secondary block">Assigned Range</span>
            <span className="font-bold theme-text-accent">
              {row.start_unit || 'Start'} → {row.end_unit || 'End'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold theme-text-secondary block">Target Class</span>
            <span className="font-medium theme-text-primary truncate block">
              {row.class_name} ({row.section_name || 'All'})
            </span>
          </div>
        </div>

        {row.lesson_instructions && (
          <p className="text-xs theme-text-secondary italic line-clamp-2 p-2 rounded-lg theme-bg-secondary/30 border theme-border/40">
            "{row.lesson_instructions}"
          </p>
        )}

        <div className="pt-2 border-t theme-border flex items-center justify-between text-xs theme-text-secondary">
          <span className="font-medium">{row.teacher_name || 'Assigned Instructor'}</span>
          {row.period_time && <span className="font-semibold theme-text-primary">{row.period_time}</span>}
        </div>
      </div>
    );
  };

  // Clean Read-Only Columns for Daily Student Assessment
  const assessmentColumns = [
    {
      header: 'Student Name',
      render: (row) => (
        <div className="cursor-pointer group">
          <span className="font-bold theme-text-primary group-hover:theme-text-accent transition-colors block">
            {row.student_name}
          </span>
          <span className="text-xs theme-text-secondary">{row.student_uniq_id}</span>
        </div>
      ),
    },
    {
      header: 'Recitation Status',
      render: (row) => {
        const statusMap = {
          MASTERED: { label: 'Mastered', className: 'theme-bg-accent-soft theme-accent border-transparent font-bold' },
          SATISFACTORY: { label: 'Satisfactory', className: 'theme-bg-secondary/40 theme-text-primary border-theme font-medium' },
          NEEDS_IMPROVEMENT: { label: 'Needs Improvement', className: 'theme-bg-secondary/40 theme-text-secondary border-theme font-medium' },
          UNPREPARED: { label: 'Unprepared', className: 'theme-bg-secondary/40 theme-text-secondary border-theme font-medium' },
          ABSENT: { label: 'Absent', className: 'theme-bg-secondary/40 theme-text-secondary border-theme font-medium' },
          NOT_EVALUATED: { label: 'Pending Evaluation', className: 'theme-bg-secondary/20 theme-text-secondary border-dashed border-theme font-medium' },
        };
        const st = statusMap[row.evaluation_status] || statusMap.NOT_EVALUATED;
        return (
          <span className={`text-xs px-2.5 py-1 rounded-full border ${st.className}`}>
            {st.label}
          </span>
        );
      },
    },
    {
      header: 'Recited Portion',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold theme-text-primary block">
            {row.lesson_covered || row.subject_name || '—'}
          </span>
          {(row.start_unit || row.end_unit) && (
            <span className="text-[11px] theme-text-secondary">
              {row.start_unit} → {row.end_unit}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Mistakes',
      align: 'center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="text-xs font-bold theme-text-primary text-center block">
          {row.is_evaluated ? row.total_mistakes : '—'}
        </span>
      ),
    },
    {
      header: 'Stucks',
      align: 'center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="text-xs font-bold theme-text-primary text-center block">
          {row.is_evaluated ? row.total_stucks : '—'}
        </span>
      ),
    },
    {
      header: 'Score',
      align: 'center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="text-xs font-bold theme-text-accent px-2.5 py-1 rounded-md border theme-border theme-bg-secondary/40">
          {row.score !== '—' ? `${row.score} / 10` : '—'}
        </span>
      ),
    },
    {
      header: 'Teacher Remarks',
      render: (row) => (
        <span className="text-xs theme-text-secondary line-clamp-1">
          {row.teacher_remarks !== '—' && row.teacher_remarks ? row.teacher_remarks : <span className="opacity-40">—</span>}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (row) => {
        const actionItems = [
          {
            label: row.is_evaluated ? 'Edit Assessment' : 'Evaluate Student',
            icon: EditIcon,
            onClick: () => {
              openDrawer('student_assessment', { studentId: row.student, date: selectedDate });
            },
          },
        ];
        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ];

  // Columns for Homework
  const hwColumns = [
    {
      header: 'Task Title & Guidelines',
      render: (row) => (
        <div>
          <span className="font-bold theme-text-primary block">{row.title}</span>
          <span className="text-xs theme-text-secondary line-clamp-1">{row.description || 'No extra notes'}</span>
        </div>
      ),
    },
    {
      header: 'Subject & Class',
      render: (row) => (
        <div>
          <span className="font-medium theme-text-primary block">{row.subject_name}</span>
          <span className="text-xs theme-text-secondary">{row.class_name}</span>
        </div>
      ),
    },
    {
      header: 'Submission Deadline',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold theme-text-primary block">{row.due_date}</span>
          <span className="text-[11px] theme-text-secondary">{row.due_time || 'End of day'}</span>
        </div>
      ),
    },
    {
      header: 'Maximum Marks',
      render: (row) => (
        <span className="text-xs font-bold theme-text-accent px-2.5 py-1 rounded-md border theme-border theme-bg-secondary/40">
          {row.max_marks} Points
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (row) => {
        const actionItems = [
          {
            label: 'Edit Homework',
            icon: EditIcon,
            onClick: () => {
              openDrawer('homework_task', { mode: 'edit', id: row.id });
            },
          },
          {
            label: 'Delete Homework',
            icon: DeleteIcon,
            variant: 'danger',
            onClick: () => {
              if (window.confirm('Delete this homework task?')) {
                learningStore.deleteHomework(tenantId, row.id);
                showToast({ type: 'success', message: 'Homework deleted.' });
                loadData();
              }
            },
          },
        ];
        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ];

  // Cards for Assessment
  const renderAssessmentCard = (row) => (
    <div
      key={row.id}
      onClick={() => openDrawer('student_assessment', { studentId: row.student, date: selectedDate })}
      className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs hover:theme-bg-sub/20 transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold theme-text-primary group-hover:theme-text-accent transition-colors">
              {row.student_name}
            </h4>
            <span className="text-xs theme-text-secondary">{row.student_uniq_id}</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border theme-border ${
            row.is_evaluated ? 'theme-text-accent' : 'theme-text-secondary'
          }`}>
            {row.evaluation_status.replace('_', ' ')}
          </span>
        </div>

        {row.lesson_covered && (
          <div className="mt-2.5 p-2 rounded-xl theme-bg-sub border theme-border text-xs">
            <span className="theme-text-secondary block">Lesson Recited:</span>
            <span className="font-semibold theme-text-primary">{row.lesson_covered}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="p-2 rounded-xl theme-bg-sub/50 border theme-border">
            <span className="text-[10px] theme-text-secondary block">Mistakes</span>
            <span className="text-xs font-bold theme-text-primary">{row.is_evaluated ? row.total_mistakes : '—'}</span>
          </div>
          <div className="p-2 rounded-xl theme-bg-sub/50 border theme-border">
            <span className="text-[10px] theme-text-secondary block">Stucks</span>
            <span className="text-xs font-bold theme-text-primary">{row.is_evaluated ? row.total_stucks : '—'}</span>
          </div>
          <div className="p-2 rounded-xl theme-bg-sub/50 border theme-border">
            <span className="text-[10px] theme-text-secondary block">Score</span>
            <span className="text-xs font-bold theme-text-accent">{row.score !== '—' ? `${row.score}/10` : '—'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t theme-border mt-2 text-xs theme-text-secondary">
        <span className="line-clamp-1 italic">{row.teacher_remarks !== '—' ? row.teacher_remarks : 'No remarks recorded'}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDrawer('student_assessment', { studentId: row.student, date: selectedDate });
          }}
          className="p-1 rounded-lg border theme-border hover:theme-bg-sub shrink-0 ml-2"
        >
          <EditIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // Cards for Homework
  const renderHwCard = (hw) => (
    <div key={hw.id} className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs hover:theme-bg-sub/20 transition-all flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-bold theme-text-accent uppercase tracking-wider block">
            {hw.subject_name}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-md border theme-border font-medium theme-text-secondary">
            Due: {hw.due_date}
          </span>
        </div>
        <h4 className="text-sm font-bold theme-text-primary mt-1">{hw.title}</h4>
        <p className="text-xs theme-text-secondary mt-1">{hw.description}</p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t theme-border mt-3 text-xs theme-text-secondary">
        <span>Max: <strong className="theme-text-primary">{hw.max_marks} Pts</strong></span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              openDrawer('homework_task', { mode: 'edit', id: hw.id });
            }}
            className="p-1 rounded-lg border theme-border hover:theme-bg-sub cursor-pointer"
          >
            <EditIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Delete homework?')) {
                learningStore.deleteHomework(tenantId, hw.id);
                showToast({ type: 'success', message: 'Homework deleted.' });
                loadData();
              }
            }}
            className="p-1 rounded-lg border theme-border hover:theme-bg-sub cursor-pointer text-red-500"
          >
            <DeleteIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer>
      {/* ─── 1. Header (Instruction & Assessment Layer) ───────────────────────── */}
      <PageHeader
        title="Daily Classroom Workspace"
        subtitle="Instruction & Assessment Layer: Manage daily lesson delivery, student recitation rubrics, and homework tasks"
        badge="Academic Studies"
        icon={BookOpenIcon}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => openDrawer('student_diary_feed', { date: selectedDate })}
              className="px-3.5 py-2 text-xs font-bold border theme-border rounded-xl theme-text-primary hover:theme-bg-sub flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <EyeIcon className="w-4 h-4" />
              Student Diary Feed
            </button>

            {activeTab === 'LESSONS' && (
              <button
                onClick={() =>
                  openDrawer('lesson_plan', {
                    mode: 'add',
                    periodId: selectedPeriodId !== 'ALL' ? selectedPeriodId : '',
                    date: selectedDate,
                  })
                }
                className="px-4 py-2 text-xs font-bold text-white theme-bg-accent hover:opacity-90 rounded-xl flex items-center gap-1.5 shadow-md transition-opacity cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                Assign Sabaq
              </button>
            )}

            {activeTab === 'ASSESSMENT' && (
              <button
                onClick={() => openDrawer('student_assessment', { date: selectedDate })}
                className="px-4 py-2 text-xs font-bold text-white theme-bg-accent hover:opacity-90 rounded-xl flex items-center gap-1.5 shadow-md transition-opacity cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                Evaluate Student
              </button>
            )}

            {activeTab === 'HOMEWORK' && (
              <button
                onClick={() => openDrawer('homework_task', { mode: 'add' })}
                className="px-4 py-2 text-xs font-bold text-white theme-bg-accent hover:opacity-90 rounded-xl flex items-center gap-1.5 shadow-md transition-opacity cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                Assign Homework
              </button>
            )}
          </div>
        }
      />

      {/* ─── 2. In-Page Tab Switcher ──────────────────────────────────────────── */}
      <TabSwitcher tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {/* ─── 3. TAB CONTENT ──────────────────────────────────────────────────── */}

      {/* ── TAB 1: Lesson Delivery & Classwork ── */}
      {activeTab === 'LESSONS' && (
        <div className="animate-fade-in">
          <UniversalManagementView
            hideHeader={true}
            isEmbedded={true}
            storageKey="spr_daily_lessons_view"
            defaultViewMode="table"
            stackedSwitcher={true}
            metrics={lessonMetrics}
            searchLabel="Search Lessons"
            searchQuery={lessonSearch}
            onSearchChange={setLessonSearch}
            searchPlaceholder="Search lesson title, subject, instructor, period..."
            filters={
              <>
                <div className="lg:col-span-2">
                  <ReusableCalendar
                    label="Lesson Date"
                    selectedDate={selectedDate}
                    onSelectDate={(val) => setSelectedDate(val)}
                    placeholder="Select Date"
                  />
                </div>

                <div className="lg:col-span-2">
                  <CustomSelect
                    label="Class"
                    options={lessonClassSelectOptions}
                    value={selectedClassId === 'ALL' && classes.length > 0 ? String(classes[0].id) : selectedClassId}
                    onChange={setSelectedClassId}
                    size="md"
                  />
                </div>

                <div className="col-span-full pt-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold theme-text-secondary uppercase tracking-wider">
                      <TimerIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                      <span>Class Routine Periods ({classFilteredPeriods.length} Slots)</span>
                    </div>
                    {selectedPeriodId !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSelectedPeriodId('ALL')}
                        className="text-xs font-semibold theme-text-accent hover:underline cursor-pointer transition-colors"
                      >
                        Reset to All Periods
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
                    {/* All Periods Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedPeriodId('ALL')}
                      className={`px-3 py-2 rounded-xl text-left shrink-0 transition-all cursor-pointer border flex flex-col justify-center min-w-[105px] ${
                        selectedPeriodId === 'ALL'
                          ? 'theme-bg-accent text-white border-transparent shadow-xs'
                          : 'theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="text-xs font-bold leading-tight">All Periods</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold shrink-0 ${
                            selectedPeriodId === 'ALL'
                              ? 'bg-white/20 text-white'
                              : 'theme-bg-sub theme-text-accent'
                          }`}
                        >
                          {totalClassLessonsCount}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] truncate max-w-[130px] mt-0.5 leading-tight ${
                          selectedPeriodId === 'ALL' ? 'text-white/80 font-medium' : 'theme-text-secondary'
                        }`}
                      >
                        All Books
                      </span>
                    </button>

                    {/* Class Filtered Periods Buttons */}
                    {classFilteredPeriods.map((period) => {
                      const isSelected = String(selectedPeriodId) === String(period.id);
                      const pCount = periodLessonCounts[period.id] || 0;
                      const periodOrdinal =
                        periodSequencesStore.getLabelForOrder(tenantId, period.period_order) ||
                        getOrdinalPeriodLabel(period.period_order || 1);

                      const bookNameText = getBookNameForPeriod(period);

                      return (
                        <button
                          key={period.id}
                          type="button"
                          onClick={() => setSelectedPeriodId(String(period.id))}
                          className={`px-3 py-2 rounded-xl text-left shrink-0 transition-all cursor-pointer border flex flex-col justify-center min-w-[120px] max-w-[210px] ${
                            isSelected
                              ? 'theme-bg-accent text-white border-transparent shadow-xs'
                              : 'theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-xs font-bold leading-tight truncate">{periodOrdinal}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : pCount > 0
                                  ? 'theme-bg-accent/15 theme-accent'
                                  : 'theme-bg-sub text-gray-400 opacity-60'
                              }`}
                            >
                              {pCount}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] truncate w-full mt-0.5 leading-tight ${
                              isSelected ? 'text-white/80 font-medium' : 'theme-text-secondary'
                            }`}
                            title={bookNameText}
                          >
                            {bookNameText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            }
            data={filteredLessons}
            columns={lessonColumns}
            renderCard={renderLessonCard}
            totalCount={filteredLessons.length}
            emptyIcon={BookOpenIcon}
            emptyTitle="No lesson deliveries found"
            emptySubMessage="Assign a daily Sabaq or select another date/period to inspect records."
          />
        </div>
      )}

      {/* ── TAB 2: Daily Student Assessment (Clean Read-Only View + Right Sidebar Edit) ── */}
      {activeTab === 'ASSESSMENT' && (
        <div className="animate-fade-in">
          <UniversalManagementView
            hideHeader={true}
            isEmbedded={true}
            storageKey="spr_daily_assessment_view"
            defaultViewMode="table"
            stackedSwitcher={true}
            metrics={assessmentMetrics}
            searchLabel="Search Students"
            searchQuery={assessmentSearch}
            onSearchChange={setAssessmentSearch}
            searchPlaceholder="Search student name, ID, roll number..."
            onRowClick={(row) => openDrawer('student_assessment', { studentId: row.student, date: selectedDate })}
            filters={
              <>
                <div className="lg:col-span-2">
                  <ReusableCalendar
                    label="Evaluation Date"
                    selectedDate={selectedDate}
                    onSelectDate={(val) => setSelectedDate(val)}
                    placeholder="Select Date"
                  />
                </div>

                <div className="lg:col-span-1">
                  <CustomSelect
                    label="Class"
                    options={classSelectOptions}
                    value={selectedClassId}
                    onChange={setSelectedClassId}
                    size="md"
                  />
                </div>

                <div className="lg:col-span-1">
                  <CustomSelect
                    label="Section"
                    options={sectionSelectOptions}
                    value={selectedSectionId}
                    onChange={setSelectedSectionId}
                    size="md"
                  />
                </div>
              </>
            }
            data={assessmentRows}
            columns={assessmentColumns}
            renderCard={renderAssessmentCard}
            totalCount={assessmentRows.length}
            emptyIcon={ChecklistIcon}
            emptyTitle="No students found"
            emptySubMessage="Select a class and section to evaluate student daily recitation."
          />
        </div>
      )}

      {/* ── TAB 3: Homework & Tasks ── */}
      {activeTab === 'HOMEWORK' && (
        <div className="animate-fade-in">
          <UniversalManagementView
            hideHeader={true}
            isEmbedded={true}
            storageKey="spr_homework_tasks_view"
            defaultViewMode="table"
            stackedSwitcher={true}
            metrics={homeworkMetrics}
            searchLabel="Search Tasks"
            searchQuery={hwSearch}
            onSearchChange={setHwSearch}
            searchPlaceholder="Search task title, subject, teacher..."
            filters={
              <>
                <div className="lg:col-span-4">
                  <CustomSelect
                    label="Class"
                    options={classSelectOptions}
                    value={selectedClassId}
                    onChange={setSelectedClassId}
                    size="md"
                  />
                </div>
              </>
            }
            data={filteredHomeworks}
            columns={hwColumns}
            renderCard={renderHwCard}
            totalCount={filteredHomeworks.length}
            emptyIcon={ClipboardDocumentCheckIcon}
            emptyTitle="No homework tasks found"
            emptySubMessage="Publish a homework assignment for student home practice."
          />
        </div>
      )}
    </PageContainer>
  );
}
