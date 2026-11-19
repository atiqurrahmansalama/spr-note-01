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
} from '../../../../components/ui/Icons';
import CustomSelect from '../../../../components/ui/CustomSelect';
import { ClassSelect, TeacherSelect, SemesterSelect } from '../../../../components/selectors';
import ActionMenu from '../../../../components/ui/ActionMenu';
import UniversalManagementView from '../../../../components/common/UniversalManagementView';
import SyllabusProgressDrawer from './SyllabusProgressDrawer';
import SyllabusDrawerForm from './SyllabusDrawerForm';
import SyllabusDetailsDrawer from './SyllabusDetailsDrawer';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { useToast } from '../../../../context/ToastContext';
import { useRightSidebar } from '../../../../context/RightSidebarContext';
import { curriculumStore, periodSequencesStore, getOrdinalPeriodLabel } from '../../../../utils/localStore';
import { fetchWithAuth } from '../../../../utils/authService';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Progress Statuses' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_STARTED', label: 'Not Started' },
];

export default function CurriculumTrackerView({
  activeTenantId,
  classes = [],
  sections = [],
  teachers = [],
  periodSlots = [],
  onOpenAddDrawer,
}) {
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Dynamic States
  const [internalSections, setInternalSections] = useState([]);
  const [internalTeachers, setInternalTeachers] = useState([]);
  const [internalPeriods, setInternalPeriods] = useState([]);

  useEffect(() => {
    if (sections && Array.isArray(sections) && sections.length > 0) {
      setInternalSections(sections);
      return;
    }

    let isMounted = true;
    const loadSections = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/academy/sections/');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalSections(list);
        }
      } catch (err) {
        console.warn('[CurriculumTracker] Failed to load sections:', err);
      }
    };
    loadSections();
    return () => {
      isMounted = false;
    };
  }, [sections]);

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

  const allSections = sections && Array.isArray(sections) && sections.length > 0
    ? sections
    : internalSections;

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
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter sections belonging to the selected class filter
  const availableSectionsForFilter = useMemo(() => {
    if (classFilter === 'ALL') return [];
    return allSections.filter((sec) => {
      const rawSecClass = sec.student_class !== undefined ? sec.student_class : (sec.student_class_id || sec.class_id || sec.class);
      const secClassId = rawSecClass
        ? (typeof rawSecClass === 'object' ? String(rawSecClass.id || '') : String(rawSecClass))
        : '';
      return secClassId === String(classFilter);
    });
  }, [allSections, classFilter]);

  const hasSectionsForClass = classFilter !== 'ALL' && availableSectionsForFilter.length > 0;

  // Filter periods dynamically based on active classFilter and sectionFilter
  const availablePeriods = useMemo(() => {
    if (!allPeriodSlots || allPeriodSlots.length === 0) return [];
    if (classFilter === 'ALL') return allPeriodSlots;

    return allPeriodSlots.filter((p) => {
      const rawCls = p.student_class !== undefined ? p.student_class : (p.student_class_id || p.class_id || p.class);
      const pClsId = rawCls ? (typeof rawCls === 'object' ? String(rawCls.id || '') : String(rawCls)) : '';

      // Institution-wide slots or slots belonging to active classFilter
      if (pClsId && pClsId !== String(classFilter)) return false;

      // If sectionFilter is selected:
      if (sectionFilter !== 'ALL') {
        const rawSec = p.section !== undefined ? p.section : p.section_id;
        const pSecId = rawSec ? (typeof rawSec === 'object' ? String(rawSec.id || '') : String(rawSec)) : '';
        // Include matching section slot or class-wide slot (where section is null/empty)
        if (pSecId && pSecId !== String(sectionFilter)) return false;
      }

      return true;
    });
  }, [allPeriodSlots, classFilter, sectionFilter]);

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

      const rawSec = p.section !== undefined ? p.section : p.section_id;
      const secId = rawSec ? (typeof rawSec === 'object' ? String(rawSec.id || '') : String(rawSec)) : '';
      const secName = p.section_name ||
        (typeof rawSec === 'object' ? rawSec?.section_name : null) ||
        (secId ? allSections.find((s) => String(s.id) === secId)?.section_name : null);
      const secBadge = secName ? ` • Sec: ${secName}` : '';

      const label = p.period_name
        ? `${seqLabel}: ${p.period_name.replace(/^(1st|2nd|3rd|\d+th)\s+Period:?\s*/i, '')}${secBadge}`
        : `${seqLabel}${secBadge}`;

      opts.push({
        value: pId,
        label: label,
      });
    });

    return opts;
  }, [availablePeriods, activeTenantId, allSections]);

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
        id: 'total_books',
        label: 'Curriculum Books',
        value: metrics.total,
        subtitle: `${metrics.inProgress} active in syllabus`,
        icon: BookOpenIcon,
        iconStyle: 'accent',
      },
      {
        id: 'completed_books',
        label: 'Completed Syllabi',
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
        const matchSection = item.sectionName?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchName && !matchSub && !matchTeacher && !matchSection && !matchNotes) return false;
      }

      if (classFilter !== 'ALL' && String(item.classId) !== String(classFilter) && item.className !== classFilter) {
        return false;
      }

      if (sectionFilter !== 'ALL') {
        if (item.sectionId && String(item.sectionId) !== String(sectionFilter)) {
          return false;
        }
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
  }, [items, searchQuery, classFilter, sectionFilter, periodFilter, semesterFilter, teacherFilter, statusFilter, allPeriodSlots, getTeacherDisplayName]);

  // Open Update Progress Drawer in RightSidebar
  const handleUpdateProgress = (item) => {
    openRightSidebar({
      title: 'Update Syllabus Progress',
      subtitle: `${item.name} • ${item.className || 'Class'} (${item.semester || 'Current Term'})`,
      icon: BookOpenIcon,
      width: 'md',
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
      width: 'lg',
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
      width: 'lg',
      content: (
        <SyllabusDrawerForm
          activeTenantId={activeTenantId}
          classes={classes}
          sections={allSections}
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
  }, [onOpenAddDrawer, openRightSidebar, closeRightSidebar, activeTenantId, classes, allSections, allTeachers, allPeriodSlots]);

  // Open Edit Drawer
  const handleEditItem = (item) => {
    openRightSidebar({
      title: 'Edit Syllabus Item',
      subtitle: `${item.name} • ${item.className || 'Class'}`,
      icon: BookOpenIcon,
      width: 'lg',
      content: (
        <SyllabusDrawerForm
          item={item}
          activeTenantId={activeTenantId}
          classes={classes}
          sections={allSections}
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
    const beforeColon = String(periodStr).split(':')[0];
    return beforeColon.replace(/\s*\([^)]*\)/g, '').replace(/\s*[-–—]\s*\d+.*$/g, '').trim();
  };

  // DataTable Columns
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
        const secDisplay = item.sectionName
          ? ` • Sec: ${item.sectionName}`
          : (item.sectionId ? ' • Specific Sec' : '');
        return (
          <div>
            <div className="font-semibold theme-text-primary">
              {getClassDisplayName(item)}{secDisplay}
            </div>
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

  // Grid Card Renderer
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
            {item.sectionName && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                Sec: {item.sectionName}
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
              <span className="font-semibold theme-text-primary">
                {getClassDisplayName(item)}{item.sectionName ? ` (Sec: ${item.sectionName})` : ''}
              </span>
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
            <span className="font-semibold theme-text-secondary">Completed</span>
            <span className="font-bold theme-text-primary">
              {cur} / {end} pgs ({pct}%)
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
    sectionFilter !== 'ALL' ||
    periodFilter !== 'ALL' ||
    semesterFilter !== 'ALL' ||
    teacherFilter !== 'ALL' ||
    statusFilter !== 'ALL'
  );

  const activeFilterCount = [
    searchQuery.trim() !== '',
    classFilter !== 'ALL',
    sectionFilter !== 'ALL',
    periodFilter !== 'ALL',
    semesterFilter !== 'ALL',
    teacherFilter !== 'ALL',
    statusFilter !== 'ALL',
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setClassFilter('ALL');
    setSectionFilter('ALL');
    setPeriodFilter('ALL');
    setSemesterFilter('ALL');
    setTeacherFilter('ALL');
    setStatusFilter('ALL');
  };

  const filterGridCols = hasSectionsForClass
    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';

  return (
    <>
      <UniversalManagementView
        hideHeader={true}
        isEmbedded={true}
        storageKey="spr_curriculum_view_mode"
        defaultViewMode="grid"
        stackedSwitcher={true}
        filterGridClassName={filterGridCols}
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
                  setSectionFilter('ALL');
                  setPeriodFilter('ALL');
                }}
                classes={classes}
                allLabel="All Classes"
                size="md"
              />
            </div>

            {hasSectionsForClass && (
              <div className="animate-fade-in">
                <CustomSelect
                  label="Section"
                  options={[
                    { value: 'ALL', label: 'All Sections' },
                    ...availableSectionsForFilter.map((s) => ({
                      value: String(s.id),
                      label: s.section_name || `Section ${s.name || ''}`,
                    })),
                  ]}
                  value={sectionFilter}
                  onChange={(val) => {
                    setSectionFilter(val);
                    setPeriodFilter('ALL');
                  }}
                  searchable={false}
                  size="md"
                />
              </div>
            )}

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
        totalCount={items.length}
        filteredCount={filteredItems.length}
        data={filteredItems}
        loading={loading}
        columns={tableColumns}
        renderCard={renderCard}
        entityName="Curriculum Book"
        pluralEntityName="Curriculum Books"
        emptyMessage="No curriculum textbooks found matching your search or filters."
        emptySubMessage="Click 'Add Book' to setup your course syllabus and track textbook progress."
      />

      {/* Delete Impact Confirmation Modal */}
      {deletingItem && (
        <DeleteImpactModal
          isOpen={Boolean(deletingItem)}
          onClose={() => !isDeleting && setDeletingItem(null)}
          onConfirm={handleConfirmDeleteItem}
          title="Remove from Curriculum"
          subtitle={`You are about to remove textbook "${deletingItem?.name}" from the active syllabus.`}
          entityName={deletingItem?.name || ''}
          entityType="Curriculum Book"
          requireAck={false}
          requireNameMatch={false}
          isDeleting={isDeleting}
          confirmButtonText="Remove Book"
          warningMessage="Removing this textbook will delete its page milestone tracking, assigned teacher schedule, and progress records."
        />
      )}
    </>
  );
}
