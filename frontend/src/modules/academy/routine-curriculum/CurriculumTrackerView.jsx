import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpenIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  ClassIcon,
  FilledCheckCircleIcon,
  GridIcon,
  TimelineIcon,
  ChartBarIcon,
  EyeIcon,
  TimerIcon,
} from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';
import { ClassSelect, TeacherSelect, SemesterSelect } from '../../../components/selectors';
import ActionMenu from '../../../components/ui/ActionMenu';
import UniversalManagementView from '../../../components/common/UniversalManagementView';
import SyllabusProgressDrawer from './SyllabusProgressDrawer';
import SyllabusDrawerForm from './SyllabusDrawerForm';
import SyllabusDetailsDrawer from './SyllabusDetailsDrawer';
import DeleteImpactModal from '../../../components/common/DeleteImpactModal';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import { curriculumStore, periodSequencesStore, getOrdinalPeriodLabel } from '../../../utils/localStore';
import { fetchWithAuth } from '../../../utils/authService';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Progress Statuses' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_STARTED', label: 'Not Started' },
];

export default function CurriculumTrackerView({
  activeTenantId,
  classes = [],
  teachers = [],
  periodSlots = [],
  onOpenAddDrawer,
}) {
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Dynamic Teacher / Staff Roster State
  const [internalTeachers, setInternalTeachers] = useState([]);

  // Dynamic Period Slots State
  const [internalPeriods, setInternalPeriods] = useState([]);

  useEffect(() => {
    if (teachers && Array.isArray(teachers) && teachers.length > 0) {
      setInternalTeachers(teachers);
      return;
    }

    let isMounted = true;
    const loadStaff = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/staff/?page_size=500');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalTeachers(list);
        }
      } catch (err) {
        console.warn('[CurriculumTracker] Failed to load staff roster:', err);
      }
    };
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, [teachers, activeTenantId]);

  useEffect(() => {
    if (periodSlots && Array.isArray(periodSlots) && periodSlots.length > 0) {
      setInternalPeriods(periodSlots);
      return;
    }

    let isMounted = true;
    const loadPeriods = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/academy/periods/');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalPeriods(list);
        }
      } catch (err) {
        console.warn('[CurriculumTracker] Failed to load period slots:', err);
      }
    };
    loadPeriods();
    return () => {
      isMounted = false;
    };
  }, [periodSlots, activeTenantId]);

  const allTeachers = teachers && Array.isArray(teachers) && teachers.length > 0
    ? teachers
    : internalTeachers;

  const allPeriodSlots = periodSlots && Array.isArray(periodSlots) && periodSlots.length > 0
    ? periodSlots
    : internalPeriods;

  // Helper to dynamically get real teacher name from current institution's staff roster
  const getTeacherDisplayName = useCallback((item) => {
    if (!item) return '—';
    if (item.teacherId && Array.isArray(allTeachers) && allTeachers.length > 0) {
      const found = allTeachers.find(
        (t) => String(t.id) === String(item.teacherId) ||
               String(t.user) === String(item.teacherId) ||
               String(t.teacher_id) === String(item.teacherId) ||
               (t.user_details && String(t.user_details.id) === String(item.teacherId))
      );
      if (found) {
        return found.name ||
               found.name_en ||
               (found.first_name ? `${found.first_name} ${found.last_name || ''}`.trim() : '') ||
               found.full_name ||
               found.label ||
               found.username ||
               item.teacherName ||
               '—';
      }
    }
    if (item.teacherName) {
      if (Array.isArray(allTeachers) && allTeachers.length > 0) {
        const foundByName = allTeachers.find(
          (t) => t.name === item.teacherName || t.name_en === item.teacherName || t.full_name === item.teacherName
        );
        if (foundByName) {
          return foundByName.name || foundByName.name_en || foundByName.full_name || item.teacherName;
        }
      }
      return item.teacherName;
    }
    return '—';
  }, [allTeachers]);

  // Helper to dynamically get real class name from current institution's class list
  const getClassDisplayName = useCallback((item) => {
    if (!item) return '—';
    if (item.classId && Array.isArray(classes) && classes.length > 0) {
      const found = classes.find((c) => String(c.id) === String(item.classId));
      if (found) {
        return found.name || found.class_name || item.className;
      }
    }
    if (item.className && Array.isArray(classes) && classes.length > 0) {
      const foundByName = classes.find((c) => c.name === item.className || c.class_name === item.className);
      if (foundByName) {
        return foundByName.name || foundByName.class_name || item.className;
      }
    }
    return item.className || '—';
  }, [classes]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter periods dynamically based on active classFilter
  const availablePeriods = useMemo(() => {
    if (!allPeriodSlots || allPeriodSlots.length === 0) return [];
    if (classFilter === 'ALL') return allPeriodSlots;
    return allPeriodSlots.filter(
      (p) =>
        String(p.student_class) === String(classFilter) ||
        String(p.academic_class) === String(classFilter) ||
        (p.student_class && String(p.student_class.id) === String(classFilter))
    );
  }, [allPeriodSlots, classFilter]);

  // Build Period Options for CustomSelect
  const periodOptions = useMemo(() => {
    const opts = [{ value: 'ALL', label: 'All Periods' }];
    const seen = new Set();

    availablePeriods.forEach((p) => {
      const pId = String(p.id);
      if (seen.has(pId)) return;
      seen.add(pId);

      const seqLabel =
        periodSequencesStore.getLabelForOrder(activeTenantId, p.period_order) ||
        getOrdinalPeriodLabel(p.period_order || 1);

      const label = p.period_name
        ? `${seqLabel}: ${p.period_name.replace(/^(1st|2nd|3rd|\d+th)\s+Period:?\s*/i, '')}`
        : seqLabel;

      opts.push({
        value: pId,
        label: label,
      });
    });

    return opts;
  }, [availablePeriods, activeTenantId]);

  // View Mode: 'grid' or 'table'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('spr_curriculum_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_curriculum_view_mode', mode);
    } catch {}
  };

  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Curriculum Items from Store
  const loadItems = useCallback(() => {
    setLoading(true);
    try {
      const data = curriculumStore.getItems(activeTenantId);
      setItems(data);
    } catch (err) {
      showToast('Failed to load curriculum records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadItems();
  }, [loadItems, version]);

  // Listen to Global Curriculum updates
  useEffect(() => {
    const handleStoreUpdate = () => setVersion((v) => v + 1);
    window.addEventListener('spr_curriculum_updated', handleStoreUpdate);
    return () => window.removeEventListener('spr_curriculum_updated', handleStoreUpdate);
  }, []);

  // Compute Live Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    let totalTargetPages = 0;
    let totalCoveredPages = 0;

    items.forEach((item) => {
      const start = Number(item.startPage) || 1;
      const end = Number(item.endPage) || start;
      const cur = Number(item.currentPage) || 0;
      const vol = Math.max(1, end - start + 1);
      const covered = Math.max(0, Math.min(vol, cur >= start ? cur - start + 1 : 0));

      totalTargetPages += vol;
      totalCoveredPages += covered;

      if (cur >= end && vol > 0) {
        completed += 1;
      } else if (cur >= start && cur > 0) {
        inProgress += 1;
      } else {
        notStarted += 1;
      }
    });

    const completionRate =
      totalTargetPages > 0 ? Math.round((totalCoveredPages / totalTargetPages) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      notStarted,
      totalTargetPages,
      totalCoveredPages,
      completionRate,
    };
  }, [items]);

  const metricCards = useMemo(
    () => [
      {
        id: 'total_curricula',
        label: 'Total Syllabi',
        value: metrics.total,
        subtitle: `${metrics.totalTargetPages} target pages`,
        icon: BookOpenIcon,
        iconStyle: 'accent',
      },
      {
        id: 'in_progress',
        label: 'Active In-Progress',
        value: metrics.inProgress,
        subtitle: 'Actively tracked in classes',
        icon: TimelineIcon,
        iconStyle: 'warning',
      },
      {
        id: 'completed_syllabi',
        label: 'Completed Books',
        value: metrics.completed,
        subtitle: '100% finished syllabus',
        icon: FilledCheckCircleIcon,
        iconStyle: 'success',
      },
      {
        id: 'aggregate_rate',
        label: 'Curriculum Coverage',
        value: `${metrics.completionRate}%`,
        subtitle: `${metrics.totalCoveredPages} of ${metrics.totalTargetPages} pages`,
        icon: ChartBarIcon,
        iconStyle: 'accent',
      },
    ],
    [metrics]
  );

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const teacherDisplayName = getTeacherDisplayName(item).toLowerCase();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchSub = item.subject?.toLowerCase().includes(q);
        const matchTeacher = item.teacherName?.toLowerCase().includes(q) || teacherDisplayName.includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchName && !matchSub && !matchTeacher && !matchNotes) return false;
      }

      if (classFilter !== 'ALL' && item.classId !== classFilter && item.className !== classFilter) {
        return false;
      }

      if (periodFilter !== 'ALL') {
        const matchSlotId =
          String(item.periodSlotId) === String(periodFilter) ||
          String(item.period_slot) === String(periodFilter);
        const matchOrder = String(item.period_order) === String(periodFilter);
        const selectedPeriodObj = allPeriodSlots.find((p) => String(p.id) === String(periodFilter));
        const matchPeriodOrder = selectedPeriodObj && (
          String(item.period_order) === String(selectedPeriodObj.period_order) ||
          String(item.periodSlotId) === String(selectedPeriodObj.id)
        );
        if (!matchSlotId && !matchOrder && !matchPeriodOrder) return false;
      }

      if (semesterFilter !== 'ALL') {
        const itemSemesters = Array.isArray(item.semesters) && item.semesters.length > 0
          ? item.semesters
          : (item.semester ? item.semester.split(',').map((s) => s.trim()) : []);
        const matchesSem = itemSemesters.some((s) => s.toLowerCase() === semesterFilter.toLowerCase()) ||
          item.semester === semesterFilter ||
          (item.semester && item.semester.toLowerCase().includes(semesterFilter.toLowerCase()));
        if (!matchesSem) return false;
      }

      if (teacherFilter !== 'ALL') {
        const teacherDisplayName = getTeacherDisplayName(item);
        if (
          String(item.teacherId) !== String(teacherFilter) &&
          item.teacherName !== teacherFilter &&
          teacherDisplayName !== teacherFilter
        ) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        const start = Number(item.startPage) || 1;
        const end = Number(item.endPage) || start;
        const cur = Number(item.currentPage) || 0;
        if (statusFilter === 'COMPLETED' && cur < end) return false;
        if (statusFilter === 'IN_PROGRESS' && (cur < start || cur >= end)) return false;
        if (statusFilter === 'NOT_STARTED' && cur >= start) return false;
      }

      return true;
    });
  }, [items, searchQuery, classFilter, periodFilter, semesterFilter, teacherFilter, statusFilter, allPeriodSlots, getTeacherDisplayName]);

  // Open Update Progress Drawer in RightSidebar
  const handleUpdateProgress = (item) => {
    openRightSidebar({
      title: 'Update Syllabus Progress',
      subtitle: `${item.name} • ${item.className || 'Class'} (${item.semester || 'Current Term'})`,
      icon: BookOpenIcon,
      width: 580,
      content: (
        <SyllabusProgressDrawer
          item={item}
          activeTenantId={activeTenantId}
          onSaveSuccess={() => {
            closeRightSidebar();
            setVersion((v) => v + 1);
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  // Open Details Drawer
  const handleViewDetails = (item) => {
    openRightSidebar({
      title: 'Syllabus Details',
      subtitle: `${item.name} • ${item.className || 'Class'}`,
      icon: BookOpenIcon,
      width: 620,
      content: (
        <SyllabusDetailsDrawer
          item={item}
          activeTenantId={activeTenantId}
          teachers={allTeachers}
          onEdit={(it) => {
            closeRightSidebar();
            setTimeout(() => handleEditItem(it), 50);
          }}
          onDelete={(it) => {
            closeRightSidebar();
            setTimeout(() => handleDeleteItem(it), 50);
          }}
          onUpdateProgress={(it) => {
            handleUpdateProgress(it);
          }}
          onClose={closeRightSidebar}
        />
      ),
    });
  };

  // Open Add Book Drawer
  const handleOpenAddBook = useCallback(() => {
    if (onOpenAddDrawer) {
      onOpenAddDrawer();
      return;
    }
    openRightSidebar({
      title: 'Add Curriculum Book',
      subtitle: 'Setup textbook target pages, assigned teacher, and academic period.',
      icon: BookOpenIcon,
      width: 620,
      content: (
        <SyllabusDrawerForm
          activeTenantId={activeTenantId}
          classes={classes}
          teachers={allTeachers}
          periodSlots={allPeriodSlots}
          onSaveSuccess={() => {
            closeRightSidebar();
            setVersion((v) => v + 1);
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  }, [onOpenAddDrawer, openRightSidebar, closeRightSidebar, activeTenantId, classes, allTeachers, allPeriodSlots]);

  // Open Edit Drawer
  const handleEditItem = (item) => {
    openRightSidebar({
      title: 'Edit Syllabus Item',
      subtitle: `${item.name} • ${item.className || 'Class'}`,
      icon: BookOpenIcon,
      width: 620,
      content: (
        <SyllabusDrawerForm
          item={item}
          activeTenantId={activeTenantId}
          classes={classes}
          teachers={allTeachers}
          periodSlots={allPeriodSlots}
          onSaveSuccess={() => {
            closeRightSidebar();
            setVersion((v) => v + 1);
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  // Delete Item
  const handleDeleteItem = (item) => {
    setDeletingItem(item);
  };

  const handleConfirmDeleteItem = () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      curriculumStore.deleteItem(activeTenantId, deletingItem.id);
      showToast(`Removed "${deletingItem.name}" from curriculum.`, 'info');
      setVersion((v) => v + 1);
      setDeletingItem(null);
    } catch (err) {
      showToast('Failed to remove syllabus item.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Reusable Helper to calculate page span details
  const getProgressStats = (item) => {
    const start = Number(item.startPage) || 1;
    const end = Number(item.endPage) || start;
    const cur = Number(item.currentPage) || 0;
    const total = Number(item.totalPages) || Math.max(1, end - start + 1);
    const covered = Math.max(0, Math.min(total, cur >= start ? cur - start + 1 : cur));
    const pct = Math.min(100, Math.round((covered / total) * 100));
    return { start, end, cur, total, covered, pct };
  };

  const getCleanPeriodName = (periodStr) => {
    if (!periodStr) return '';
    // Take only the period slot part before any colon (e.g. "1st Period: Sabq" -> "1st Period")
    const beforeColon = String(periodStr).split(':')[0];
    return beforeColon.replace(/\s*\([^)]*\)/g, '').replace(/\s*[-–—]\s*\d+.*$/g, '').trim();
  };

  // ─── Reusable DataTable Columns ───────────────────────────────────────────
  const tableColumns = useMemo(() => [
    {
      header: 'Textbook Title',
      accessor: 'name',
      headerClassName: 'py-3 px-4 min-w-[200px] max-w-[280px]',
      cellClassName: 'py-3.5 px-4 font-bold theme-text-primary max-w-[280px]',
      render: (item) => (
        <div
          onClick={() => handleViewDetails(item)}
          className="cursor-pointer group/title space-y-0.5 overflow-hidden"
          title="Click to view full syllabus details"
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="truncate group-hover/title:theme-accent transition-colors">
              {item.name}
            </span>
            {item.volumes && item.volumes.length > 1 && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider theme-bg-accent text-white shrink-0">
                {item.volumes.length} Vol
              </span>
            )}
          </div>
          {item.subject && (
            <div className="text-[10px] theme-text-secondary font-medium truncate">
              {item.subject}
            </div>
          )}
          {(item.startChapter || item.endChapter) && (
            <div className="text-[10px] theme-accent font-medium truncate">
              {item.startChapter && item.endChapter ? `${item.startChapter} → ${item.endChapter}` : item.startChapter || item.endChapter}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Class & Term',
      headerClassName: 'py-3 px-4',
      cellClassName: 'py-3.5 px-4',
      render: (item) => {
        const sems = Array.isArray(item.semesters) && item.semesters.length > 0
          ? item.semesters.join(', ')
          : (item.semester || '1st Term');
        return (
          <div>
            <div className="font-semibold theme-text-primary">{getClassDisplayName(item)}</div>
            <div className="text-[10px] theme-text-secondary truncate max-w-[140px]">{sems}</div>
          </div>
        );
      },
    },
    {
      header: 'Routine Period',
      headerClassName: 'py-3 px-4',
      cellClassName: 'py-3.5 px-4 font-semibold theme-text-primary',
      render: (item) => {
        const clean = getCleanPeriodName(item.periodName);
        return clean ? <span>{clean}</span> : <span className="text-xs theme-text-secondary italic font-normal">—</span>;
      },
    },
    {
      header: 'Teacher',
      headerClassName: 'py-3 px-4',
      cellClassName: 'py-3.5 px-4',
      render: (item) => {
        const teacherName = getTeacherDisplayName(item);
        return teacherName && teacherName !== '—' ? (
          <span className="font-medium theme-text-primary truncate">{teacherName}</span>
        ) : (
          <span className="text-xs theme-text-secondary italic font-normal">—</span>
        );
      },
    },
    {
      header: 'Page',
      headerClassName: 'py-3 px-4 text-center',
      cellClassName: 'py-3.5 px-4 text-center font-semibold',
      render: (item) => {
        const { start, end, total } = getProgressStats(item);
        return (
          <div>
            <span>{start} – {end}</span>
            <div className="text-[10px] theme-text-secondary">{total} pages</div>
          </div>
        );
      },
    },
    {
      header: 'Progress',
      headerClassName: 'py-3 px-4 min-w-[180px]',
      cellClassName: 'py-3.5 px-4',
      render: (item) => {
        const { cur, end, pct } = getProgressStats(item);
        return (
          <div
            onClick={() => handleUpdateProgress(item)}
            className="space-y-1.5 cursor-pointer group/progress p-1 -m-1 rounded-lg hover:theme-bg-sub/60 transition"
            title="Click to update page milestone in drawer"
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="theme-text-secondary group-hover/progress:theme-text-primary transition-colors">
                {cur} / {end} pgs
              </span>
              <span
                className={
                  pct >= 100
                    ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
                    : pct >= 50
                    ? 'theme-accent font-extrabold'
                    : 'text-amber-500 dark:text-amber-400 font-extrabold'
                }
              >
                {pct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full theme-bg-elevated overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct >= 100
                    ? 'bg-emerald-500'
                    : pct >= 50
                    ? 'theme-bg-accent'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: '',
      headerClassName: 'py-3 px-4 text-right w-12',
      cellClassName: 'py-3.5 px-4 text-right',
      render: (item) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            items={[
              {
                label: 'View Full Details',
                icon: EyeIcon,
                onClick: () => handleViewDetails(item),
              },
              {
                label: 'Update Page Milestone',
                icon: TimelineIcon,
                onClick: () => handleUpdateProgress(item),
              },
              {
                label: 'Edit Syllabus Item',
                icon: EditIcon,
                onClick: () => handleEditItem(item),
              },
              {
                label: 'Remove from Curriculum',
                icon: TrashIcon,
                isDestructive: true,
                onClick: () => handleDeleteItem(item),
              },
            ]}
          />
        </div>
      ),
    },
  ], [getClassDisplayName, getTeacherDisplayName, handleViewDetails, handleUpdateProgress, handleEditItem, handleDeleteItem]);

  // ─── Reusable Grid Card Renderer ──────────────────────────────────────────
  const renderCard = useCallback((item) => {
    const { start, end, cur, total, covered, pct } = getProgressStats(item);

    return (
      <div
        key={item.id}
        className="rounded-2xl border theme-border theme-bg-surface p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group"
      >
        {/* Top Badges & Action Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent">
              {item.subject || 'General'}
            </span>
            {item.volumes && item.volumes.length > 1 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-accent text-white shadow-2xs">
                {item.volumes.length} Vols
              </span>
            )}
            {(Array.isArray(item.semesters) && item.semesters.length > 0
              ? item.semesters
              : [item.semester || '1st Semester']
            ).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-sub border theme-border theme-text-secondary">
                {s}
              </span>
            ))}
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu
              items={[
                {
                  label: 'Update Progress',
                  icon: BookOpenIcon,
                  onClick: () => handleUpdateProgress(item),
                },
                {
                  label: 'View Details',
                  icon: EyeIcon,
                  onClick: () => handleViewDetails(item),
                },
                {
                  label: 'Edit Syllabus Details',
                  icon: EditIcon,
                  onClick: () => handleEditItem(item),
                },
                {
                  label: 'Remove from Curriculum',
                  icon: TrashIcon,
                  isDestructive: true,
                  onClick: () => handleDeleteItem(item),
                },
              ]}
            />
          </div>
        </div>

        {/* Title & Academic Scope */}
        <div
          onClick={() => handleViewDetails(item)}
          className="cursor-pointer group/cardtitle"
        >
          <h4 className="text-sm font-bold theme-text-primary group-hover/cardtitle:theme-accent transition-colors line-clamp-1">
            {item.name}
          </h4>
          {(item.startChapter || item.endChapter) && (
            <div className="text-[11px] font-medium theme-accent mt-0.5 truncate">
              {item.startChapter && item.endChapter ? `${item.startChapter} → ${item.endChapter}` : item.startChapter || item.endChapter}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs theme-text-secondary flex-wrap">
            <span className="flex items-center gap-1">
              <ClassIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="font-semibold theme-text-primary">{getClassDisplayName(item)}</span>
            </span>
            {item.periodName && (
              <>
                <span>•</span>
                <span className="font-semibold theme-text-primary">
                  {getCleanPeriodName(item.periodName)}
                </span>
              </>
            )}
            <span>•</span>
            <span className="truncate">{getTeacherDisplayName(item)}</span>
          </div>
        </div>

        {/* Progress Box */}
        <div className="space-y-1.5 p-3 rounded-xl theme-bg-sub/70 border theme-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold theme-text-secondary">
              Page <strong className="theme-text-primary font-bold">{cur}</strong> of{' '}
              <strong className="theme-text-primary font-bold">{end}</strong>
            </span>
            <span
              className={`font-extrabold ${
                pct >= 100
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : pct >= 50
                  ? 'theme-accent'
                  : 'text-amber-500 dark:text-amber-400'
              }`}
            >
              {pct}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full theme-bg-elevated overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                pct >= 100
                  ? 'bg-emerald-500'
                  : pct >= 50
                  ? 'theme-bg-accent'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] theme-text-secondary pt-0.5">
            <span>Span: {start}–{end} ({total} pgs)</span>
            <span className="font-semibold">
              {pct >= 100 ? 'Completed' : `${total - covered} pgs left`}
            </span>
          </div>
        </div>

        {/* Notes Snippet */}
        {item.notes && (
          <p className="text-[11px] theme-text-secondary line-clamp-1 italic">
            "{item.notes}"
          </p>
        )}

        {/* Footer Card Status */}
        <div className="pt-2 border-t theme-border flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold ${
              pct >= 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : pct > 0
                ? 'theme-accent'
                : 'theme-text-secondary'
            }`}
          >
            {pct >= 100 ? '✓ Completed' : pct > 0 ? '● In Progress' : '○ Not Started'}
          </span>

          <span className="text-[11px] font-semibold theme-text-secondary">
            {pct}% Covered
          </span>
        </div>
      </div>
    );
  }, [getTeacherDisplayName, getClassDisplayName, handleViewDetails, handleUpdateProgress, handleEditItem, handleDeleteItem]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() !== '' ||
    classFilter !== 'ALL' ||
    periodFilter !== 'ALL' ||
    semesterFilter !== 'ALL' ||
    teacherFilter !== 'ALL' ||
    statusFilter !== 'ALL'
  );

  const activeFilterCount = [
    searchQuery.trim() !== '',
    classFilter !== 'ALL',
    periodFilter !== 'ALL',
    semesterFilter !== 'ALL',
    teacherFilter !== 'ALL',
    statusFilter !== 'ALL',
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setClassFilter('ALL');
    setPeriodFilter('ALL');
    setSemesterFilter('ALL');
    setTeacherFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <UniversalManagementView
      hideHeader={true}
      isEmbedded={true}
      storageKey="spr_curriculum_view_mode"
      defaultViewMode="grid"
      stackedSwitcher={true}
      filterGridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
      searchSpanClassName="col-span-1"
      metrics={metricCards}
      onAddNew={handleOpenAddBook}
      addNewText="Add Book"
      searchLabel="Search Syllabus"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Textbook, subject, teacher..."
      filters={
        <>
          <div>
            <ClassSelect
              label="Class"
              value={classFilter}
              onChange={(val) => {
                setClassFilter(val);
                setPeriodFilter('ALL');
              }}
              classes={classes}
              allLabel="All Classes"
              size="md"
            />
          </div>

          <div>
            <CustomSelect
              label="Period"
              options={periodOptions}
              value={periodFilter}
              onChange={setPeriodFilter}
              searchable={false}
              size="md"
            />
          </div>

          <div>
            <SemesterSelect
              label="Semester"
              value={semesterFilter}
              onChange={setSemesterFilter}
              allowAll={true}
              searchable={false}
              allLabel="All Semesters"
              size="md"
            />
          </div>

          <div>
            <TeacherSelect
              label="Teacher"
              searchable={false}
              value={teacherFilter}
              onChange={setTeacherFilter}
              teachers={allTeachers}
              allLabel="All Teachers"
              onlyTeachers={true}
              size="md"
            />
          </div>

          <div>
            <CustomSelect
              label="Progress Status"
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
              size="md"
            />
          </div>
        </>
      }
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      onResetFilters={handleResetFilters}
      loading={loading}
      loadingMessage="Loading curriculum syllabus records..."
      data={filteredItems}
      totalCount={items.length}
      itemLabel="Syllabi"
      columns={tableColumns}
      renderCard={renderCard}
      emptyIcon={BookOpenIcon}
      emptyTitle="No Curriculum Syllabi Found"
      emptySubMessage={
        hasActiveFilters
          ? 'No syllabus items match your active filter criteria.'
          : 'Start by adding textbooks and syllabus milestones to track institutional progress.'
      }
      modals={
        <DeleteImpactModal
          isOpen={Boolean(deletingItem)}
          onClose={() => !isDeleting && setDeletingItem(null)}
          onConfirm={handleConfirmDeleteItem}
          title="Remove Syllabus Item"
          subtitle={`You are about to remove syllabus item "${deletingItem?.name}".`}
          entityName={deletingItem?.name || ''}
          entityType="Syllabus Item"
          requireAck={false}
          requireNameMatch={false}
          isDeleting={isDeleting}
          confirmButtonText="Remove Syllabus"
          warningMessage="Removing this syllabus item will delete tracked reading progress, page span milestones, and student targets."
        />
      }
    />
  );
}
