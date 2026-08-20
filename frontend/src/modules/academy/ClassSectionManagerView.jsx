import React, { useState, useEffect } from 'react';
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
import CustomSelect from '../../components/ui/CustomSelect';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionFormModal from './SectionFormModal';
import { getSections, getSectionMetrics, deleteSection, getBranches } from '../../api/academy';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';

const TYPE_CONFIG = {
  GENERAL_SECTION: { label: 'General Section', variant: 'sky' },
  HIFZ_HALQA: { label: 'Hifz Halqa', variant: 'emerald' },
  RESIDENTIAL_DORM: { label: 'Residential Dorm', variant: 'amber' },
};

export default function ClassSectionManagerView() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClass = searchParams.get('class') || 'ALL';
  const queryBranch = searchParams.get('branch') || 'ALL';

  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
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

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_sections_view_mode', mode);
    } catch {}
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadData();
  }, [classFilter, branchFilter]);

  const loadLookups = async () => {
    try {
      const [classRes, branchRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/classes/'),
        getBranches(),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (branchRes.status === 'fulfilled') {
        const d = branchRes.value;
        setBranches(Array.isArray(d) ? d : d.results || []);
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
    setEditingSection(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setIsFormModalOpen(true);
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
      title: 'Total Sections',
      value: metrics.total_sections || sections.length,
      icon: ClassIcon,
      accentColor: 'sky',
      trend: 'Active divisions',
    },
    {
      title: 'Total Capacity',
      value: metrics.total_capacity || 0,
      icon: StudentIcon,
      accentColor: 'indigo',
      trend: 'Allocated seats',
    },
    {
      title: 'Enrolled Students',
      value: metrics.total_enrolled || 0,
      icon: StudentIcon,
      accentColor: 'emerald',
      trend: 'Active enrollment',
    },
    {
      title: 'Occupancy Rate',
      value: `${metrics.occupancy_rate || 0}%`,
      icon: SparklesIcon,
      accentColor: 'purple',
      trend: 'Utilization',
    },
  ];

  const classFilterOptions = [
    { label: 'All Classes', value: 'ALL' },
    ...classes.map((c) => ({
      label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
      value: c.id,
    })),
  ];

  const branchFilterOptions = [
    { label: 'All Branches', value: 'ALL' },
    ...branches.map((b) => ({
      label: b.branch_name,
      value: b.id,
    })),
  ];

  const tableColumns = [
    {
      header: 'Section / Halqa',
      accessor: 'section_name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
            {row.section_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-zinc-100">{row.section_name}</div>
            <div className="text-xs text-zinc-400 font-mono">{row.student_class_name}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Format / Type',
      accessor: 'section_type',
      cell: (row) => {
        const conf = TYPE_CONFIG[row.section_type] || { label: row.section_type, variant: 'zinc' };
        return <StatusBadge status={conf.label} variant={conf.variant} />;
      },
    },
    {
      header: 'Campus / Branch',
      accessor: 'branch_name',
      cell: (row) => (
        <span className="text-xs text-zinc-300 font-medium">
          {row.branch_name || 'Main Campus'}
        </span>
      ),
    },
    {
      header: 'Room',
      accessor: 'room_number',
      cell: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-xs font-mono text-zinc-300">
          {row.room_number || 'TBD'}
        </span>
      ),
    },
    {
      header: 'Class Teacher',
      accessor: 'class_teacher_name',
      cell: (row) => (
        <div className="text-xs text-zinc-200">
          {row.class_teacher_name || <span className="text-zinc-500 italic">Unassigned</span>}
        </div>
      ),
    },
    {
      header: 'Capacity',
      accessor: 'enrolled_students',
      cell: (row) => {
        const pct = row.capacity_percentage || 0;
        const color = pct >= 95 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

        return (
          <div className="w-32">
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>{row.enrolled_students || 0}/{row.max_capacity}</span>
              <span className="font-mono">{pct}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'is_active',
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? 'Active' : 'Inactive'}
          variant={row.is_active ? 'emerald' : 'zinc'}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-zinc-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all"
            title="Edit Section"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Delete Section"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <PageHeader
        title="Class Sections & Halqa Management"
        subtitle="Manage class sub-sections, halqas, seat capacities, room allocations, and ustadh assignments."
        icon={ClassIcon}
        breadcrumbs={[
          { label: 'Academy', path: '/academy-profile' },
          { label: 'Classes & Sections', path: '/academy/classes' },
        ]}
        actions={
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Section / Halqa</span>
          </button>
        }
      />

      {/* Metrics */}
      <MetricsGrid metrics={metricCards} />

      {/* Filter and Switcher Controls */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search sections, rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/70 border border-zinc-800/90 pl-10 pr-4 py-2 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Class Filter */}
          <div className="w-48">
            <CustomSelect
              options={classFilterOptions}
              value={classFilter}
              onChange={(val) => setClassFilter(val)}
              placeholder="Filter by Class"
            />
          </div>

          {/* Branch Filter */}
          <div className="w-44">
            <CustomSelect
              options={branchFilterOptions}
              value={branchFilter}
              onChange={(val) => setBranchFilter(val)}
              placeholder="Filter by Branch"
            />
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => handleToggleViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'grid'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Cards Grid
          </button>
          <button
            onClick={() => handleToggleViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Data Table
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
          <svg className="animate-spin w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-xs font-medium">Loading class sections...</span>
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <ClassIcon className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">No Class Sections Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5">
            Create class sections, halqas, and dormitories to organize student enrollment.
          </p>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl shadow-lg transition-all"
          >
            Create First Section
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSections.map((sec) => {
            const typeConf = TYPE_CONFIG[sec.section_type] || {
              label: sec.section_type,
              variant: 'zinc',
            };
            const pct = sec.capacity_percentage || 0;
            const barColor =
              pct >= 95 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

            return (
              <div
                key={sec.id}
                className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
              >
                <div>
                  {/* Top Line */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                        {sec.section_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-100 text-sm group-hover:text-sky-300 transition-colors">
                          {sec.section_name}
                        </h4>
                        <div className="text-xs text-zinc-400 font-mono">
                          {sec.student_class_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(sec)}
                        className="p-1.5 text-zinc-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all"
                        title="Edit Section"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sec)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Delete Section"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <StatusBadge status={typeConf.label} variant={typeConf.variant} />
                    {sec.branch_name && (
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-[11px] text-zinc-300 flex items-center gap-1">
                        <BuildingOfficeIcon className="w-3 h-3 text-zinc-500" />
                        <span>{sec.branch_name}</span>
                      </span>
                    )}
                    {sec.room_number && (
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-[11px] font-mono text-zinc-300">
                        {sec.room_number}
                      </span>
                    )}
                  </div>

                  {/* Teacher Assignment */}
                  <div className="bg-zinc-950/60 border border-zinc-800/60 p-3 rounded-xl mb-4 text-xs">
                    <div className="text-zinc-500 text-[11px] mb-1">Class Ustadh / Teacher:</div>
                    {sec.class_teacher_name ? (
                      <div className="flex items-center gap-2 font-medium text-zinc-200">
                        <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px] font-bold">
                          {sec.class_teacher_name.charAt(0)}
                        </div>
                        <span>{sec.class_teacher_name}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic">No assigned teacher</span>
                    )}
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">
                      Capacity: <span className="font-semibold text-zinc-200">{sec.enrolled_students || 0}</span>/{sec.max_capacity}
                    </span>
                    <span className="font-mono font-medium text-zinc-300">{pct}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <DataTable columns={tableColumns} data={filteredSections} />
        </div>
      )}

      {/* Form Modal */}
      <SectionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingSection={editingSection}
        defaultClassId={classFilter !== 'ALL' ? classFilter : null}
        defaultBranchId={branchFilter !== 'ALL' ? branchFilter : null}
        onSuccess={loadData}
      />
    </div>
  );
}
