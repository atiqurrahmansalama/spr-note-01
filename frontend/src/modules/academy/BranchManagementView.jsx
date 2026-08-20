import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  PhoneIcon,
  MailIcon,
  LocationIcon,
  TeacherIcon,
  ClassIcon,
  StudentIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import MetricsGrid from '../../components/ui/MetricsGrid';
import DataTable from '../../components/ui/DataTable';
import DataCardGrid from '../../components/ui/DataCardGrid';
import ActionMenu from '../../components/ui/ActionMenu';
import CustomSelect from '../../components/ui/CustomSelect';
import StatusBadge from '../../components/ui/StatusBadge';
import DataViewToolbar from '../../components/ui/DataViewToolbar';
import DataViewFooter from '../../components/ui/DataViewFooter';
import BranchForm from './BranchForm';
import { getBranches, getBranchMetrics, deleteBranch } from '../../api/academy';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar } from '../../context/RightSidebarContext';

const BRANCH_TYPE_OPTIONS = [
  { label: 'All Campus Types', value: 'ALL' },
  { label: 'Main Campus', value: 'MAIN_CAMPUS' },
  { label: 'Sub Branch', value: 'SUB_BRANCH' },
  { label: 'Female Branch', value: 'FEMALE_BRANCH' },
  { label: 'Residential Campus', value: 'RESIDENTIAL_CAMPUS' },
];

export default function BranchManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
  onMetricsLoaded = null,
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [metrics, setMetrics] = useState({
    total_branches: 0,
    main_campuses: 0,
    sub_branches: 0,
    total_capacity: 0,
    active_in_charges: 0,
  });
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('spr_branches_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_branches_view_mode', mode);
    } catch {}
  };

  useEffect(() => {
    loadData();

    const handleTenantChanged = () => {
      loadData();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    return () => window.removeEventListener('spr_tenant_changed', handleTenantChanged);
  }, [typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchData, metricData] = await Promise.allSettled([
        getBranches({ type: typeFilter }),
        getBranchMetrics(),
      ]);

      if (branchData.status === 'fulfilled') {
        const list = Array.isArray(branchData.value)
          ? branchData.value
          : branchData.value.results || [];
        setBranches(list);
      }
      if (metricData.status === 'fulfilled') {
        setMetrics(metricData.value);
      }
    } catch {
      showToast('Could not load academic branches.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const handleCreateNew = () => {
    openRightSidebar({
      title: 'Register Academic Branch',
      width: 780,
      content: (
        <BranchForm
          onSaved={() => {
            loadData();
            closeRightSidebar();
            showToast('Branch registered successfully.', 'success');
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleEdit = (branch) => {
    openRightSidebar({
      title: `Edit: ${branch.branch_name}`,
      width: 780,
      content: (
        <BranchForm
          branch={branch}
          onSaved={() => {
            loadData();
            closeRightSidebar();
            showToast('Branch updated successfully.', 'success');
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleDelete = async (branch) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branch.branch_name}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteBranch(branch.id);
      showToast(`Branch "${branch.branch_name}" deleted successfully.`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete branch.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Reusable 3-Dots Action Items Menu
  const getActionMenuItems = (branch) => [
    {
      label: 'Edit Branch',
      icon: EditIcon,
      onClick: () => handleEdit(branch),
    },
    {
      divider: true,
    },
    {
      label: 'Delete Branch',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDelete(branch),
    },
  ];

  // Filter branches locally by search query
  const filteredBranches = branches.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.branch_name && b.branch_name.toLowerCase().includes(q)) ||
      (b.branch_code && b.branch_code.toLowerCase().includes(q)) ||
      (b.district && b.district.toLowerCase().includes(q)) ||
      (b.division && b.division.toLowerCase().includes(q)) ||
      (b.in_charge_name && b.in_charge_name.toLowerCase().includes(q))
    );
  });

  const metricCards = [
    {
      title: 'Total Campuses',
      value: metrics.total_branches || branches.length,
      icon: BuildingOfficeIcon,
      accentColor: 'accent',
      trend: `${metrics.main_campuses || 0} Main`,
    },
    {
      title: 'Main Campuses',
      value: metrics.main_campuses || 0,
      icon: BuildingOfficeIcon,
      accentColor: 'default',
      trend: 'Central hubs',
    },
    {
      title: 'Total Capacity',
      value: metrics.total_capacity || 0,
      icon: StudentIcon,
      accentColor: 'default',
      trend: 'Across sections',
    },
    {
      title: 'Campus In-Charges',
      value: metrics.active_in_charges || 0,
      icon: TeacherIcon,
      accentColor: 'default',
      trend: 'Designated heads',
    },
  ];

  // Reusable Table Columns Definition for DataTable (Campus Type, Profile Icon, Sections removed)
  const tableColumns = [
    {
      header: 'Branch Name',
      key: 'branch_name',
      headerClassName: 'min-w-[200px]',
      render: (row) => (
        <div>
          <div className="font-semibold theme-text-primary text-xs sm:text-sm">{row.branch_name}</div>
          {row.branch_code && (
            <div className="text-xs theme-text-secondary font-mono mt-0.5">{row.branch_code}</div>
          )}
        </div>
      ),
    },
    {
      header: 'In-Charge Staff',
      key: 'in_charge_name',
      headerClassName: 'min-w-[180px]',
      render: (row) => (
        <div>
          {row.in_charge_name ? (
            <div>
              <div className="text-xs font-medium theme-text-primary">{row.in_charge_name}</div>
              {row.in_charge_phone && (
                <div className="text-[10px] theme-text-secondary font-mono mt-0.5">{row.in_charge_phone}</div>
              )}
            </div>
          ) : (
            <span className="text-xs theme-text-secondary italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Location',
      key: 'district',
      headerClassName: 'min-w-[180px]',
      render: (row) => (
        <div className="text-xs theme-text-secondary">
          {row.district && row.division ? (
            <span>{row.district}, {row.division}</span>
          ) : row.address ? (
            <span className="truncate max-w-xs block">{row.address}</span>
          ) : (
            <span className="italic">--</span>
          )}
        </div>
      ),
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

  // Reusable Card Renderer for DataCardGrid (Campus Type, Profile Icon, Sections removed, ActionMenu integrated)
  const renderBranchCard = (branch) => {
    return (
      <div
        key={branch.id}
        className="theme-bg-surface border theme-border hover:border-current rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
      >
        <div>
          {/* Top Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <h4 className="font-bold theme-text-primary text-sm leading-snug break-words">
                {branch.branch_name}
              </h4>
              {branch.branch_code && (
                <div className="text-[11px] font-mono theme-text-secondary mt-0.5">
                  Code: {branch.branch_code}
                </div>
              )}
            </div>

            <div className="shrink-0">
              <ActionMenu items={getActionMenuItems(branch)} />
            </div>
          </div>

          {/* Location & Contact Info */}
          <div className="space-y-2 py-3 border-y theme-border my-3 text-xs theme-text-secondary">
            {branch.address && (
              <div className="flex items-center gap-2 truncate">
                <LocationIcon className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{branch.address}</span>
              </div>
            )}
            {branch.district && (
              <div className="flex items-center gap-2">
                <span className="w-3.5 text-center opacity-60 font-mono text-[10px]">GEO</span>
                <span>{branch.district}, {branch.division}</span>
              </div>
            )}
            {branch.contact_phone && (
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span>{branch.contact_phone}</span>
              </div>
            )}
          </div>

          {/* Campus In-Charge */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="theme-text-secondary">In-Charge:</div>
            {branch.in_charge_name ? (
              <div className="font-medium theme-text-primary text-right truncate">
                <span>{branch.in_charge_name}</span>
              </div>
            ) : (
              <span className="theme-text-secondary italic">Not assigned</span>
            )}
          </div>
        </div>

        {/* Footer Status */}
        <div className="mt-4 pt-3 border-t theme-border flex items-center justify-between text-xs">
          <span className="text-xs theme-text-secondary">Operational Status:</span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              branch.is_active
                ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20"
                : "theme-bg-sub theme-text-secondary border theme-border"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? "bg-[var(--accent-main)]" : "theme-bg-elevated"}`}></span>
            {branch.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    );
  };

  const emptySubMessage = searchQuery
    ? `No branch matched "${searchQuery}". Try clearing search filter.`
    : 'Register campuses, main branches, and residential buildings to start organizing class sections.';

  return (
    <div className={`${isEmbedded ? 'w-full space-y-6 animate-fadeIn' : 'p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn'}`}>
      {/* Page Header */}
      {!hideHeader && (
        <PageHeader
          title="Academy Multi-Branch Management"
          subtitle="Manage multi-campus institutions, sub-branches, residential facilities, and campus leadership."
          icon={BuildingOfficeIcon}
          breadcrumbs={[
            { label: 'Academy', path: '/academy-profile' },
            { label: 'Branches & Sections', path: '/academy/branches' },
          ]}
          actions={
            <button
              type="button"
              onClick={handleCreateNew}
              className="px-4 py-2 text-xs font-bold theme-bg-accent theme-accent-text rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Academic Branch</span>
            </button>
          }
        />
      )}

      {/* Metrics Grid */}
      {!hideMetrics && <MetricsGrid metrics={metricCards} />}

      {/* Controls Bar */}
      <DataViewToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search branches, code, district..."
        filterElement={
          <CustomSelect
            options={BRANCH_TYPE_OPTIONS}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            placeholder="Filter by Type"
          />
        }
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* Main Content Area: Reusable DataCardGrid or DataTable */}
      <div className="space-y-4">
        {viewMode === 'grid' ? (
          <DataCardGrid
            data={filteredBranches}
            renderCard={renderBranchCard}
            isLoading={loading}
            loadingMessage="Loading academy branches..."
            emptyTitle="No Academic Branches Found"
            emptySubMessage={emptySubMessage}
            emptyIcon={BuildingOfficeIcon}
            gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          />
        ) : (
          <DataTable
            columns={tableColumns}
            data={filteredBranches}
            isLoading={loading}
            loadingMessage="Loading academy branches..."
            emptyTitle="No Academic Branches Found"
            emptySubMessage={emptySubMessage}
            emptyIcon={BuildingOfficeIcon}
          />
        )}

        {/* Reusable DataViewFooter */}
        {!loading && branches.length > 0 && (
          <DataViewFooter
            filteredCount={filteredBranches.length}
            totalCount={branches.length}
            itemLabel="branches & campuses"
          />
        )}
      </div>
    </div>
  );
}
