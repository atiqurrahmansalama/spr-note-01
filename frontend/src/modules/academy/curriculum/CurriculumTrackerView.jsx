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
} from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';
import { ClassSelect, TeacherSelect } from '../../../components/selectors';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import ActionMenu from '../../../components/ui/ActionMenu';
import SyllabusProgressModal from './SyllabusProgressModal';
import SyllabusDrawerForm from './SyllabusDrawerForm';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import { curriculumStore } from '../../../utils/localStore';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Progress Statuses' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_STARTED', label: 'Not Started' },
];

const SEMESTER_FILTERS = [
  { value: 'ALL', label: 'All Semesters / Terms' },
  { value: '1st Semester', label: '1st Semester' },
  { value: '2nd Semester', label: '2nd Semester' },
  { value: 'Final Term', label: 'Final Term' },
  { value: 'Annual Syllabus', label: 'Annual Syllabus' },
];

export default function CurriculumTrackerView({
  activeTenantId,
  classes = [],
  teachers = [],
  onOpenAddDrawer,
}) {
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  // Quick Update Modal State
  const [selectedItemForProgress, setSelectedItemForProgress] = useState(null);

  // Load Curriculum Items from Store
  const loadItems = useCallback(() => {
    setLoading(true);
    try {
      const data = curriculumStore.getItems(activeTenantId);
      setItems(data);
    } catch (err) {
      showToast('Failed to load curriculum syllabus.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadItems();
  }, [loadItems, version]);

  useEffect(() => {
    const handleStoreUpdate = () => setVersion((v) => v + 1);
    window.addEventListener('spr_curriculum_updated', handleStoreUpdate);
    return () => window.removeEventListener('spr_curriculum_updated', handleStoreUpdate);
  }, []);

  // Calculate Metrics
  const metrics = useMemo(() => {
    return curriculumStore.getMetrics(activeTenantId);
  }, [activeTenantId, items]);

  const metricCards = useMemo(() => {
    return [
      {
        id: 'total_syllabi',
        label: 'Total Syllabi',
        value: metrics.totalItems,
        icon: BookOpenIcon,
        trend: 'Active Curriculum',
        color: 'sky',
      },
      {
        id: 'in_progress_syllabi',
        label: 'In Progress',
        value: metrics.inProgressItems,
        icon: ChartBarIcon,
        trend: 'Ongoing Studies',
        color: 'amber',
      },
      {
        id: 'completed_syllabi',
        label: 'Fully Completed',
        value: metrics.completedItems,
        icon: FilledCheckCircleIcon,
        trend: '100% Covered',
        color: 'emerald',
      },
      {
        id: 'overall_progress',
        label: 'Institutional Progress',
        value: `${metrics.overallProgressPct}%`,
        icon: TimelineIcon,
        trend: 'Curriculum Coverage',
        color: 'purple',
      },
    ];
  }, [metrics]);

  // Filtered Syllabi List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchSub = (item.subject || '').toLowerCase().includes(q);
        const matchTeacher = (item.teacherName || '').toLowerCase().includes(q);
        const matchClass = (item.className || '').toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchSub && !matchTeacher && !matchClass && !matchNotes) return false;
      }

      // Class Filter
      if (classFilter !== 'ALL' && String(item.classId) !== String(classFilter)) return false;

      // Semester Filter
      if (semesterFilter !== 'ALL' && item.semester !== semesterFilter) return false;

      // Teacher Filter
      if (teacherFilter !== 'ALL' && String(item.teacherId) !== String(teacherFilter)) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      return true;
    });
  }, [items, searchQuery, classFilter, semesterFilter, teacherFilter, statusFilter]);

  // Open Edit Drawer
  const handleEditItem = (item) => {
    openRightSidebar({
      title: 'Edit Syllabus Item',
      subtitle: `${item.name} • ${item.className || 'Class'}`,
      icon: BookOpenIcon,
      width: 580,
      content: (
        <SyllabusDrawerForm
          item={item}
          activeTenantId={activeTenantId}
          classes={classes}
          teachers={teachers}
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
    if (window.confirm(`Are you sure you want to remove "${item.name}" from the curriculum?`)) {
      curriculumStore.deleteItem(activeTenantId, item.id);
      showToast(`Removed "${item.name}" from curriculum.`, 'info');
      setVersion((v) => v + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Dynamic Overview KPI Cards */}
      <MetricsGrid items={metricCards} />

      {/* 2. Search & Filters Toolbar */}
      <div className="p-3 sm:p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5 select-none">
              Search Syllabus
            </label>
            <div className="relative">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
              <input
                type="text"
                placeholder="Textbook, subject, teacher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              />
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <ClassSelect
              label="Class Filter"
              value={classFilter}
              onChange={setClassFilter}
              classes={classes}
              allLabel="All Classes"
            />
          </div>

          {/* Semester Filter */}
          <div>
            <CustomSelect
              label="Semester / Term"
              options={SEMESTER_FILTERS}
              value={semesterFilter}
              onChange={setSemesterFilter}
            />
          </div>

          {/* Teacher Filter */}
          <div>
            <TeacherSelect
              label="Assigned Teacher"
              value={teacherFilter}
              onChange={setTeacherFilter}
              teachers={teachers}
              allLabel="All Teachers"
              onlyTeachers={true}
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              label="Progress Status"
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        {/* View Mode Switcher and Quick Count */}
        <div className="pt-2 border-t theme-border flex items-center justify-between">
          <div className="text-xs font-semibold theme-text-secondary">
            Showing <span className="theme-text-primary font-bold">{filteredItems.length}</span> of{' '}
            <span className="theme-text-primary font-bold">{items.length}</span> Syllabi
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'theme-bg-accent theme-accent-text border-transparent'
                  : 'theme-bg-sub theme-text-secondary theme-border hover:theme-bg-elevated'
              }`}
              title="Card Grid View"
            >
              <GridIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                viewMode === 'table'
                  ? 'theme-bg-accent theme-accent-text border-transparent'
                  : 'theme-bg-sub theme-text-secondary theme-border hover:theme-bg-elevated'
              }`}
              title="Data Table View"
            >
              <TimelineIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Body Content (Cards Grid vs. Table) */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border theme-border theme-bg-surface shadow-xs space-y-3">
          <BookOpenIcon className="w-10 h-10 mx-auto theme-text-secondary opacity-40" />
          <h4 className="text-sm font-bold theme-text-primary">No Curriculum Syllabi Found</h4>
          <p className="text-xs theme-text-secondary max-w-sm mx-auto">
            {searchQuery || classFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No items match your current search and filter criteria.'
              : 'Start by adding textbooks and syllabus milestones to track institutional progress.'}
          </p>
          {onOpenAddDrawer && (
            <button
              type="button"
              onClick={onOpenAddDrawer}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add First Syllabus</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const start = Number(item.startPage) || 1;
            const end = Number(item.endPage) || start;
            const cur = Number(item.currentPage) || 0;
            const total = Math.max(1, end - start + 1);
            const covered = Math.max(0, Math.min(total, cur >= start ? cur - start + 1 : 0));
            const pct = Math.min(100, Math.round((covered / total) * 100));

            return (
              <div
                key={item.id}
                className="rounded-2xl border theme-border theme-bg-surface p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group"
              >
                {/* Top Row: Category Badge & Action Menu */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent">
                      {item.subject || 'General'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-sub border theme-border theme-text-secondary">
                      {item.semester || '1st Semester'}
                    </span>
                  </div>

                  <ActionMenu
                    actions={[
                      {
                        label: 'Update Page Milestone',
                        icon: BookOpenIcon,
                        onClick: () => setSelectedItemForProgress(item),
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

                {/* Title & Academic Scope */}
                <div>
                  <h4 className="text-sm font-bold theme-text-primary group-hover:theme-accent transition-colors line-clamp-1">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs theme-text-secondary">
                    <span className="flex items-center gap-1">
                      <ClassIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="font-semibold theme-text-primary">{item.className || 'All Classes'}</span>
                    </span>
                    <span>•</span>
                    <span className="truncate">{item.teacherName || 'Unassigned Teacher'}</span>
                  </div>
                </div>

                {/* Progress Bar & Volume Details */}
                <div className="space-y-1.5 p-3 rounded-xl theme-bg-sub/70 border theme-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold theme-text-secondary">
                      Page <strong className="theme-text-primary font-bold">{cur}</strong> of{' '}
                      <strong className="theme-text-primary font-bold">{end}</strong>
                    </span>
                    <span
                      className={`font-extrabold ${
                        pct >= 100
                          ? 'text-emerald-500'
                          : pct >= 50
                          ? 'theme-accent'
                          : 'text-amber-500'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Visual Bar */}
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

                {/* Notes Snippet if available */}
                {item.notes && (
                  <p className="text-[11px] theme-text-secondary line-clamp-1 italic">
                    "{item.notes}"
                  </p>
                )}

                {/* Quick Update Button */}
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

                  <button
                    type="button"
                    onClick={() => setSelectedItemForProgress(item)}
                    className="px-3 py-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer flex items-center gap-1 shadow-2xs hover:theme-accent hover:border-[var(--accent-main)]"
                  >
                    <BookOpenIcon className="w-3.5 h-3.5 theme-accent" />
                    <span>Update Page</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Structured Table View */
        <div className="rounded-3xl border theme-border theme-bg-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b theme-border theme-bg-sub text-[11px] uppercase tracking-wider font-bold theme-text-secondary">
                  <th className="py-3 px-4">Textbook / Syllabus</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Class & Term</th>
                  <th className="py-3 px-4">Assigned Teacher</th>
                  <th className="py-3 px-4 text-center">Page Span</th>
                  <th className="py-3 px-4 min-w-[160px]">Progress</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filteredItems.map((item) => {
                  const start = Number(item.startPage) || 1;
                  const end = Number(item.endPage) || start;
                  const cur = Number(item.currentPage) || 0;
                  const total = Math.max(1, end - start + 1);
                  const covered = Math.max(0, Math.min(total, cur >= start ? cur - start + 1 : 0));
                  const pct = Math.min(100, Math.round((covered / total) * 100));

                  return (
                    <tr
                      key={item.id}
                      className="hover:theme-bg-sub/50 transition-colors group font-medium"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold theme-text-primary">
                        <div className="line-clamp-1">{item.name}</div>
                        {item.notes && (
                          <div className="text-[10px] theme-text-secondary font-normal line-clamp-1">
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent">
                          {item.subject || 'General'}
                        </span>
                      </td>

                      {/* Class & Term */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold theme-text-primary">{item.className || '—'}</div>
                        <div className="text-[10px] theme-text-secondary">{item.semester || '1st Term'}</div>
                      </td>

                      {/* Teacher */}
                      <td className="py-3.5 px-4 theme-text-secondary">
                        {item.teacherName || '—'}
                      </td>

                      {/* Page Span */}
                      <td className="py-3.5 px-4 text-center font-semibold">
                        <span>{start} – {end}</span>
                        <div className="text-[10px] theme-text-secondary">{total} pages</div>
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span>{cur} / {end} pgs</span>
                          <span className={pct >= 100 ? 'text-emerald-500' : 'theme-accent'}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full theme-bg-elevated overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100
                                ? 'bg-emerald-500'
                                : pct >= 50
                                ? 'theme-bg-accent'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            pct >= 100
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : pct > 0
                              ? 'theme-bg-accent-soft theme-accent'
                              : 'theme-bg-sub theme-text-secondary'
                          }`}
                        >
                          {pct >= 100 ? 'Completed' : pct > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedItemForProgress(item)}
                            className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
                            title="Update Reading Milestone"
                          >
                            Update
                          </button>
                          <ActionMenu
                            actions={[
                              {
                                label: 'Update Progress',
                                icon: BookOpenIcon,
                                onClick: () => setSelectedItemForProgress(item),
                              },
                              {
                                label: 'Edit Syllabus',
                                icon: EditIcon,
                                onClick: () => handleEditItem(item),
                              },
                              {
                                label: 'Delete Syllabus',
                                icon: TrashIcon,
                                isDestructive: true,
                                onClick: () => handleDeleteItem(item),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Progress Modal */}
      <SyllabusProgressModal
        isOpen={Boolean(selectedItemForProgress)}
        onClose={() => setSelectedItemForProgress(null)}
        item={selectedItemForProgress}
        activeTenantId={activeTenantId}
        onProgressUpdated={() => setVersion((v) => v + 1)}
      />
    </div>
  );
}
