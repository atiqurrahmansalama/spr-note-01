import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  LocationIcon,
  TeacherIcon,
  ClassIcon,
  StudentIcon,
} from '../../components/ui/Icons';
import ActionMenu from '../../components/ui/ActionMenu';
import CustomSelect from '../../components/ui/CustomSelect';
import UniversalManagementView from '../../components/common/UniversalManagementView';
import BranchForm from './BranchForm';
import { getBranches, getBranchMetrics, deleteBranch } from '../../api/academy';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';

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
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const [branches, setBranches] = useState([]);
  const [metrics, setMetrics] = useState({
    total_branches: 0,
    main_campuses: 0,
    sub_branches: 0,
    total_capacity: 0,
    active_in_charges: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [deletingBranch, setDeletingBranch] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
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
  }, [typeFilter, showToast]);

  useEffect(() => {
    loadData();

    const handleTenantChanged = () => {
      loadData();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    return () => window.removeEventListener('spr_tenant_changed', handleTenantChanged);
  }, [loadData]);

  // Universal Drawer Registration for Branch Form
  useDrawerRegistration(
    'branch',
    (params) => {
      const mode = params.get('mode') || 'add';
      const branchId = params.get('id');
      const foundBranch = branchId ? branches.find((b) => String(b.id) === String(branchId)) : null;

      return {
        title: mode === 'add' ? 'Create Campus Branch' : `Edit: ${foundBranch?.name || 'Branch'}`,
        category: 'Campus Management',
        size: 'lg',
        content: (
          <BranchForm
            editingBranch={foundBranch}
            onSaved={() => {
              loadData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [branches, loadData, closeDrawer]
  );

  const handleOpenAdd = () => {
    openDrawer('branch', { mode: 'add' });
  };

  const handleOpenEdit = (branch) => {
    openDrawer('branch', { mode: 'edit', id: branch.id });
  };

  const handleDelete = (branch) => {
    setDeletingBranch(branch);
  };

  const confirmDelete = async () => {
    if (!deletingBranch) return;
    setIsDeleting(true);
    try {
      await deleteBranch(deletingBranch.id);
      showToast(`Branch "${deletingBranch.name}" removed successfully.`, 'success');
      setDeletingBranch(null);
      loadData();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to remove branch.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBranches = branches.filter((b) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        b.name?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.district?.toLowerCase().includes(q) ||
        b.in_charge_name?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionMenuItems = (branch) => [
    {
      label: 'Edit Branch',
      icon: EditIcon,
      onClick: () => handleOpenEdit(branch),
    },
    {
      label: 'View Sections',
      icon: ClassIcon,
      onClick: () => navigate(`/academy/classes-groups?tab=sections&branch=${branch.id}`),
    },
    { divider: true },
    {
      label: 'Delete Branch',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDelete(branch),
    },
  ];

  const tableColumns = [
    {
      key: 'name',
      header: 'Branch Name & Code',
      render: (branch) => (
        <div className="space-y-0.5">
          <span className="font-bold text-sm theme-text-primary block">{branch.name}</span>
          <div className="flex items-center gap-1.5">
            {branch.code && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-block">
                {branch.code}
              </span>
            )}
            <span className="text-[10px] theme-text-secondary">
              {branch.branch_type ? branch.branch_type.replace('_', ' ') : 'Main'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'in_charge',
      header: 'Branch In-Charge',
      render: (branch) => (
        <span className="text-xs font-semibold theme-text-primary">
          {branch.in_charge_name || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location / City',
      render: (branch) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary">
          <LocationIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span>{branch.district || branch.city || branch.address || '—'}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      align: 'center',
      render: (branch) => (
        <span className="text-xs font-mono font-bold theme-text-primary">
          {branch.capacity || '—'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      align: 'center',
      render: (branch) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            branch.is_active
              ? 'theme-bg-accent-soft theme-accent border theme-border'
              : 'theme-bg-sub theme-text-secondary border theme-border'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? 'theme-bg-accent' : 'theme-bg-elevated'}`}></span>
          {branch.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (branch) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(branch)} align="right" />
        </div>
      ),
    },
  ];

  const renderBranchCard = (branch) => (
    <div
      key={branch.id}
      className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group"
    >
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold theme-text-primary text-sm leading-tight truncate">
                {branch.name}
              </h3>
              {branch.code && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg theme-bg-sub theme-text-secondary border theme-border">
                  {branch.code}
                </span>
              )}
            </div>
            <p className="text-xs theme-text-secondary mt-0.5">
              {branch.branch_type ? branch.branch_type.replace('_', ' ') : 'Main Campus'}
            </p>
          </div>
          <ActionMenu items={getActionMenuItems(branch)} align="right" />
        </div>

        <div className="text-xs space-y-1.5 theme-text-secondary border-t theme-border pt-2.5">
          <div className="flex items-center justify-between">
            <span>In-Charge:</span>
            <span className="font-medium theme-text-primary">{branch.in_charge_name || 'Unassigned'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Location:</span>
            <span className="font-medium theme-text-primary">{branch.district || branch.city || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Capacity:</span>
            <span className="font-mono font-bold theme-text-primary">{branch.capacity || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <UniversalManagementView
      title="Campus Branches"
      subtitle="Manage physical branches, campus locations, and regional administrative zones"
      icon={BuildingOfficeIcon}
      hideHeader={hideHeader}
      hideMetrics={hideMetrics}
      isEmbedded={isEmbedded}
      storageKey="spr_branches_view_mode"
      defaultViewMode="grid"
      headerActions={
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add Branch</span>
        </button>
      }
      metrics={[
        {
          label: 'Total Branches',
          value: metrics.total_branches || branches.length,
          icon: BuildingOfficeIcon,
          color: 'accent',
        },
        {
          label: 'Main Campuses',
          value: metrics.main_campuses || 0,
          icon: ClassIcon,
          color: 'default',
        },
        {
          label: 'Total Capacity',
          value: metrics.total_capacity || 0,
          icon: StudentIcon,
          color: 'default',
        },
        {
          label: 'Active In-Charges',
          value: metrics.active_in_charges || 0,
          icon: TeacherIcon,
          color: 'default',
        },
      ]}
      searchLabel="Search Branches"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search branches, code, district..."
      filters={
        <div className="w-36 sm:w-44 shrink-0">
          <CustomSelect
            label="Branch Type"
            options={BRANCH_TYPE_OPTIONS}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            placeholder="All Types"
            size="md"
          />
        </div>
      }
      hasActiveFilters={searchQuery.trim() !== '' || typeFilter !== 'ALL'}
      loading={loading}
      loadingMessage="Loading academic branches..."
      data={filteredBranches}
      totalCount={branches.length}
      itemLabel="branches"
      columns={tableColumns}
      renderCard={renderBranchCard}
      onRowClick={(branch) => handleOpenEdit(branch)}
      selectable={true}
      emptyIcon={BuildingOfficeIcon}
      emptyTitle="No Branches Found"
      emptySubMessage={
        searchQuery || typeFilter !== 'ALL'
          ? 'No campus branches match your active filter criteria.'
          : 'Get started by creating your first campus branch or facility.'
      }
      modals={
        deletingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
              <h3 className="text-base font-bold theme-text-primary">Delete Branch</h3>
              <p className="text-xs theme-text-secondary">
                Are you sure you want to remove <span className="font-semibold theme-text-primary">"{deletingBranch.name}"</span>?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setDeletingBranch(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:opacity-90 transition disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    />
  );
}
