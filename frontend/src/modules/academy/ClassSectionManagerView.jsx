import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClassIcon,
  BuildingOfficeIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  StudentIcon,
  TeacherIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import MetricsGrid from '../../components/ui/MetricsGrid';
import DataTable from '../../components/ui/DataTable';
import DataCardGrid from '../../components/ui/DataCardGrid';
import DataViewToolbar from '../../components/ui/DataViewToolbar';
import DataViewFooter from '../../components/ui/DataViewFooter';
import ActionMenu from '../../components/ui/ActionMenu';
import CustomSelect from '../../components/ui/CustomSelect';
import SectionForm from './SectionForm';
import { getSections, getSectionMetrics, deleteSection, getBranches } from '../../api/academy';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';

const TYPE_CONFIG = {
  GENERAL_SECTION: 'General Section',
  HIFZ_HALQA: 'Hifz Halqa',
  RESIDENTIAL_DORM: 'Residential Dorm',
};

export default function ClassSectionManagerView() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClass = searchParams.get('class') || 'ALL';
  const queryBranch = searchParams.get('branch') || 'ALL';

  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [metrics, setMetrics] = useState({
    total_sections: 0,
    total_capacity: 0,
    total_enrolled: 0,
    occupancy_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('spr_sections_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState(queryClass);
  const [branchFilter, setBranchFilter] = useState(queryBranch);

  const { openDrawer, closeDrawer } = useRightSidebar();

  // Universal Drawer Registration for Section Form (survives F5 refresh)
  useDrawerRegistration(
    'section',
    (params) => {
      const mode = params.get('mode') || 'add';
      const sectionId = params.get('id');
      const foundSection = sectionId ? sections.find((s) => String(s.id) === String(sectionId)) : null;

      return {
        title: mode === 'add' ? 'Create Class Section / Halqa' : `Edit: ${foundSection?.section_name || 'Section'}`,
        category: 'Classes & Groups',
        size: 'md',
        content: (
          <SectionForm
            section={foundSection}
            classes={classes}
            branches={branches}
            teachers={teachers}
            defaultClassId={classFilter !== 'ALL' ? classFilter : null}
            defaultBranchId={branchFilter !== 'ALL' ? branchFilter : null}
            onSaved={() => {
              loadData();
              closeDrawer();
              showToast(mode === 'add' ? 'Class section created successfully.' : 'Class section updated successfully.', 'success');
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [sections, classes, branches, teachers, classFilter, branchFilter, loadData, closeDrawer, showToast]
  );

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_sections_view_mode', mode);
    } catch {}
  };

  const handleSelectRow = useCallback((id) => {
    setSelectedIds((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    });
  }, []);

  const handleSelectAll = useCallback((val) => {
    if (Array.isArray(val)) {
      setSelectedIds(val);
    } else {
      setSelectedIds([]);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadData();
  }, [classFilter, branchFilter]);

  const loadLookups = async () => {
    try {
      const [classRes, branchRes, teacherRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/classes/'),
        getBranches(),
        fetchWithAuth('/api/v1/users/'),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (branchRes.status === 'fulfilled') {
        const d = branchRes.value;
        setBranches(Array.isArray(d) ? d : d.results || []);
      }
      if (teacherRes.status === 'fulfilled' && teacherRes.value.ok) {
        const d = await teacherRes.value.json();
        setTeachers(Array.isArray(d) ? d : d.results || []);
      }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (classFilter && classFilter !== 'ALL') params.class = classFilter;
      if (branchFilter && branchFilter !== 'ALL') params.branch = branchFilter;

      const [secData, metricData] = await Promise.allSettled([
        getSections(params),
        getSectionMetrics(),
      ]);

      if (secData.status === 'fulfilled') {
        const list = Array.isArray(secData.value)
          ? secData.value
          : secData.value.results || [];
        setSections(list);
      }
      if (metricData.status === 'fulfilled') {
        setMetrics(metricData.value);
      }
    } catch {
      showToast('Could not load class sections.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    openDrawer('section', { mode: 'add' });
  };

  const handleEdit = (section) => {
    openDrawer('section', { mode: 'edit', id: section.id });
  };

  const handleDelete = async (section) => {
    if (!window.confirm(`Are you sure you want to delete section "${section.section_name}"?`)) {
      return;
    }
    try {
      await deleteSection(section.id);
      showToast(`Section "${section.section_name}" deleted.`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete section.', 'error');
    }
  };

  const getActionMenuItems = (section) => [
    {
      label: 'Edit Section',
      icon: EditIcon,
      onClick: () => handleEdit(section),
    },
    {
      divider: true,
    },
    {
      label: 'Delete Section',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDelete(section),
    },
  ];

  const filteredSections = sections.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.section_name && s.section_name.toLowerCase().includes(q)) ||
      (s.student_class_name && s.student_class_name.toLowerCase().includes(q)) ||
      (s.branch_name && s.branch_name.toLowerCase().includes(q)) ||
      (s.room_number && s.room_number.toLowerCase().includes(q)) ||
      (s.class_teacher_name && s.class_teacher_name.toLowerCase().includes(q))
    );
  });

  const metricCards = [
    {
      label: 'Total Sections',
      value: metrics.total_sections || sections.length,
      icon: ClassIcon,
      color: 'accent',
      subLabel: 'Active divisions',
    },
    {
      label: 'Total Capacity',
      value: metrics.total_capacity || 0,
      icon: StudentIcon,
      color: 'default',
      subLabel: 'Allocated seats',
    },
    {
      label: 'Enrolled Students',
      value: metrics.total_enrolled || 0,
      icon: StudentIcon,
      color: 'default',
      subLabel: 'Active enrollment',
    },
    {
      label: 'Occupancy Rate',
      value: `${metrics.occupancy_rate || 0}%`,
      icon: SparklesIcon,
      color: 'accent',
      subLabel: 'Utilization',
    },
  ];

  const classFilterOptions = [
    { label: 'All Classes', value: 'ALL' },
    ...classes.map((c) => ({
      label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
      value: String(c.id),
    })),
  ];

  const branchFilterOptions = [
    { label: 'All Branches', value: 'ALL' },
    ...branches.map((b) => ({
      label: b.branch_name,
      value: String(b.id),
    })),
  ];

  const tableColumns = [
    {
      header: 'Section / Halqa',
      key: 'section_name',
      headerClassName: 'min-w-[200px]',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent font-bold text-xs">
            {row.section_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold theme-text-primary text-xs sm:text-sm">{row.section_name}</div>
            <div className="text-[11px] theme-text-secondary font-mono mt-0.5">{row.student_class_name}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Format / Type',
      key: 'section_type',
      headerClassName: 'min-w-[140px]',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold theme-bg-sub border theme-border theme-text-primary">
          {TYPE_CONFIG[row.section_type] || row.section_type}
        </span>
      ),
    },
    {
      header: 'Campus / Branch',
      key: 'branch_name',
      headerClassName: 'min-w-[150px]',
      render: (row) => (
        <span className="text-xs theme-text-secondary font-medium">
          {row.branch_name || 'Main Campus'}
        </span>
      ),
    },
    {
      header: 'Room',
      key: 'room_number',
      headerClassName: 'w-24',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg theme-bg-sub border theme-border text-xs font-mono theme-text-primary">
          {row.room_number || 'TBD'}
        </span>
      ),
    },
    {
      header: 'Class Teacher',
      key: 'class_teacher_name',
      headerClassName: 'min-w-[160px]',
      render: (row) => (
        <div className="text-xs theme-text-primary font-medium">
          {row.class_teacher_name || <span className="theme-text-secondary italic">Unassigned</span>}
        </div>
      ),
    },
    {
      header: 'Capacity',
      key: 'enrolled_students',
      headerClassName: 'w-36',
      render: (row) => {
        const pct = row.capacity_percentage || 0;
        return (
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-[10px] theme-text-secondary">
              <span>{row.enrolled_students || 0}/{row.max_capacity}</span>
              <span className="font-mono">{pct}%</span>
            </div>
            <div className="w-full theme-bg-sub rounded-full h-1.5 overflow-hidden border theme-border">
              <div
                className="h-full theme-bg-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      key: 'is_active',
      headerClassName: 'w-24 text-center',
      align: 'center',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            row.is_active
              ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20"
              : "theme-bg-sub theme-text-secondary border theme-border"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? "bg-[var(--accent-main)]" : "theme-bg-elevated"}`}></span>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (row) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(row)} />
        </div>
      ),
    },
  ];

  const renderSectionCard = (sec) => {
    const pct = sec.capacity_percentage || 0;

    return (
      <div
        key={sec.id}
        className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
      >
        <div>
          {/* Top Line */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent font-bold text-sm shrink-0">
                {sec.section_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold theme-text-primary text-sm truncate">
                  {sec.section_name}
                </h4>
                <div className="text-xs theme-text-secondary font-mono truncate">
                  {sec.student_class_name}
                </div>
              </div>
            </div>

            <ActionMenu items={getActionMenuItems(sec)} />
          </div>

          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
            <span className="px-2 py-0.5 rounded-lg theme-bg-sub border theme-border theme-text-primary font-medium">
              {TYPE_CONFIG[sec.section_type] || sec.section_type}
            </span>
            {sec.branch_name && (
              <span className="px-2 py-0.5 rounded-lg theme-bg-sub border theme-border theme-text-secondary flex items-center gap-1">
                <BuildingOfficeIcon className="w-3 h-3 opacity-60" />
                <span>{sec.branch_name}</span>
              </span>
            )}
            {sec.room_number && (
              <span className="px-2 py-0.5 rounded-lg theme-bg-sub border theme-border font-mono theme-text-secondary">
                Room {sec.room_number}
              </span>
            )}
          </div>

          {/* Teacher Assignment */}
          <div className="text-xs theme-text-secondary py-2 border-t theme-border">
            <span className="opacity-70">Ustadh / Teacher:</span>{' '}
            <span className="theme-text-primary font-medium">
              {sec.class_teacher_name || <span className="italic opacity-60">Unassigned</span>}
            </span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="pt-3 border-t theme-border mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-secondary">Capacity Occupancy</span>
            <span className="font-mono font-bold theme-text-primary">
              {sec.enrolled_students || 0}/{sec.max_capacity}{' '}
              <span className="theme-accent font-normal">({pct}%)</span>
            </span>
          </div>
          <div className="w-full theme-bg-sub rounded-full h-2 overflow-hidden border theme-border">
            <div
              className="h-full theme-bg-accent rounded-full transition-all"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 font-sans text-left animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Class Sections & Halqa Management"
        subtitle="Manage class sub-sections, halqas, seat capacities, room allocations, and ustadh assignments."
        icon={ClassIcon}
        actions={
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Section / Halqa</span>
          </button>
        }
      />

      {/* Metrics */}
      <MetricsGrid items={metricCards} />

      {/* Filter and Switcher Controls */}
      <DataViewToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search sections, rooms, teachers..."
        filterElement={
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              options={classFilterOptions}
              value={classFilter}
              onChange={(val) => setClassFilter(val)}
              placeholder="Filter by Class"
            />
            <CustomSelect
              options={branchFilterOptions}
              value={branchFilter}
              onChange={(val) => setBranchFilter(val)}
              placeholder="Filter by Branch"
            />
          </div>
        }
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* Main Content: DataCardGrid or DataTable */}
      <div className="space-y-4">
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold theme-text-primary">
              {selectedIds.length} {selectedIds.length === 1 ? 'section' : 'sections'} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-bold theme-text-secondary hover:theme-text-primary px-3 py-1 rounded-lg theme-bg-sub border theme-border transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        )}

        {viewMode === 'grid' ? (
          <DataCardGrid
            data={filteredSections}
            renderCard={renderSectionCard}
            isLoading={loading}
            loadingMessage="Loading class sections..."
            emptyTitle="No Class Sections Found"
            emptySubMessage="Create class sections, halqas, and dormitories to organize student enrollment."
            emptyIcon={ClassIcon}
            gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          />
        ) : (
          <DataTable
            columns={tableColumns}
            data={filteredSections}
            selectable={true}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            idField="id"
            isLoading={loading}
            loadingMessage="Loading class sections..."
            emptyTitle="No Class Sections Found"
            emptySubMessage="Create class sections, halqas, and dormitories to organize student enrollment."
            emptyIcon={ClassIcon}
          />
        )}

        {/* Reusable DataViewFooter */}
        {!loading && sections.length > 0 && (
          <DataViewFooter
            filteredCount={filteredSections.length}
            totalCount={sections.length}
            itemLabel="class sections"
          />
        )}
      </div>
    </div>
  );
}
