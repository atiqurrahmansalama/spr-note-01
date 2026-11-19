import React, { useState, useEffect, useCallback } from 'react';
import {
  BuildingOfficeIcon,
  EditIcon,
  TrashIcon,
  LocationIcon,
  TeacherIcon,
  CheckCircleIcon,
  SleekCheckIcon,
  TableIcon,
  Squares2X2Icon,
} from '../../../../components/ui/Icons';
import ActionMenu from '../../../../components/ui/ActionMenu';
import CustomButton from '../../../../components/ui/CustomButton';
import DataTable from '../../../../components/ui/DataTable';
import DataCardGrid from '../../../../components/ui/DataCardGrid';
import BranchForm from './BranchForm';
import { getBranches, deleteBranch } from '../../../../api/academy';
import { useToast } from '../../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { useAcademicSession } from '../../../../context/AcademicSessionContext';
import { getBranchDisplayName, branchCategoriesStore } from '../../../../utils/localStore';

export default function BranchManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { activeBranch, setActiveBranch } = useAcademicSession();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingBranch, setDeletingBranch] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('spr_branches_view_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_branches_view_mode', mode);
    } catch {}
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const branchData = await getBranches({ type: 'ALL' });
      const list = Array.isArray(branchData)
        ? branchData
        : branchData?.results || [];
      setBranches(list);
    } catch {
      showToast('Could not load academic branches.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();

    const handleTenantChanged = () => {
      loadData();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    return () => window.removeEventListener('spr_tenant_changed', handleTenantChanged);
  }, [loadData]);

  // Handle setting active branch
  const handleSetActiveBranch = useCallback((branchObj) => {
    if (!branchObj) return;
    setActiveBranch(branchObj);
    showToast(`Active campus switched to ${getBranchDisplayName(branchObj)}`, 'info');
  }, [setActiveBranch, showToast]);

  // Universal Drawer Registration for Branch Form
  useDrawerRegistration(
    'branch',
    (params) => {
      const mode = params.get('mode') || 'add';
      const branchId = params.get('id');
      const foundBranch = branchId ? branches.find((b) => String(b.id) === String(branchId)) : null;

      return {
        title: mode === 'add' ? 'Create Campus Branch' : `Edit: ${getBranchDisplayName(foundBranch) || 'Branch'}`,
        category: 'Campus Management',
        size: 'lg',
        content: (
          <BranchForm
            key={branchId ? `edit-branch-${branchId}` : 'add-branch'}
            branch={foundBranch}
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

  const getActionMenuItems = (branch) => {
    const isCurrentActive = String(branch.id) === String(activeBranch?.id);
    return [
      ...(!isCurrentActive
        ? [
            {
              label: 'Make Active Campus',
              icon: SleekCheckIcon,
              onClick: () => handleSetActiveBranch(branch),
            },
          ]
        : []),
      {
        label: 'Edit Branch',
        icon: EditIcon,
        onClick: () => handleOpenEdit(branch),
      },
      { divider: true },
      {
        label: 'Delete Branch',
        icon: TrashIcon,
        danger: true,
        onClick: () => handleDelete(branch),
      },
    ];
  };

  const tableColumns = [
    {
      key: 'index',
      header: 'No',
      align: 'center',
      headerClassName: 'w-14 text-center font-mono text-xs',
      cellClassName: 'w-14 text-center font-mono text-xs',
      render: (_, rowIdx) => (
        <span className="font-mono text-xs font-bold theme-text-secondary">
          {rowIdx + 1}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Branch Name & Code',
      headerClassName: 'min-w-[220px] sm:min-w-[280px]',
      cellClassName: 'min-w-[220px] sm:min-w-[280px]',
      render: (branch) => {
        const isCurrentActive = String(branch.id) === String(activeBranch?.id);
        return (
          <div className="space-y-0.5 py-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm theme-text-primary block">{getBranchDisplayName(branch)}</span>
              {isCurrentActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-bg-accent theme-accent-text flex items-center gap-1 shadow-2xs">
                  <CheckCircleIcon className="w-2.5 h-2.5" />
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {(branch.branch_code || branch.code) && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-block">
                  {branch.branch_code || branch.code}
                </span>
              )}
              <span className="text-[10px] theme-text-secondary">
                {branchCategoriesStore.getCategoryLabel(branch.branch_type) || 'Main Campus'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'in_charge',
      header: 'Branch In-Charge',
      headerClassName: 'min-w-[180px] sm:min-w-[220px]',
      cellClassName: 'min-w-[180px] sm:min-w-[220px]',
      render: (branch) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary py-1">
          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className={`font-semibold ${branch.in_charge_name ? 'theme-text-primary' : 'theme-text-muted italic'}`}>
            {branch.in_charge_name || 'Unassigned'}
          </span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location / City',
      headerClassName: 'min-w-[160px] sm:min-w-[200px]',
      cellClassName: 'min-w-[160px] sm:min-w-[200px]',
      render: (branch) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary py-1">
          <LocationIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className="truncate">{branch.district || branch.city || branch.address || '—'}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      align: 'center',
      headerClassName: 'w-24 text-center',
      cellClassName: 'w-24 text-center',
      render: (branch) => (
        <span className="text-xs font-bold font-mono theme-text-primary px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border inline-block">
          {branch.capacity || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      cellClassName: 'w-16 text-right',
      render: (branch) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(branch)} align="right" />
        </div>
      ),
    },
  ];

  const renderBranchCard = (branch) => {
    const isCurrentActive = String(branch.id) === String(activeBranch?.id);
    return (
      <div
        key={branch.id}
        onClick={() => handleOpenEdit(branch)}
        className={`rounded-2xl theme-bg-surface border p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group relative cursor-pointer ${
          isCurrentActive ? 'border-[var(--accent-main)] ring-1 ring-[var(--accent-main)]/20' : 'theme-border'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold theme-text-primary text-sm leading-tight truncate group-hover:theme-accent transition-colors">
                  {getBranchDisplayName(branch)}
                </h3>
                {isCurrentActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-bg-accent theme-accent-text flex items-center gap-1 shadow-2xs">
                    <CheckCircleIcon className="w-3 h-3" />
                    Active Campus
                  </span>
                )}
                {(branch.branch_code || branch.code) && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border">
                    {branch.branch_code || branch.code}
                  </span>
                )}
              </div>
              <p className="text-xs theme-text-secondary mt-0.5">
                {branchCategoriesStore.getCategoryLabel(branch.branch_type) || 'Main Campus'}
              </p>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <ActionMenu items={getActionMenuItems(branch)} align="right" />
            </div>
          </div>

          <div className="text-xs space-y-1.5 theme-text-secondary border-t theme-border pt-2.5">
            <div className="flex items-center justify-between">
              <span>In-Charge:</span>
              <span className="font-medium theme-text-primary">{branch.in_charge_name || 'Unassigned'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Location:</span>
              <span className="font-medium theme-text-primary truncate ml-2">{branch.district || branch.city || branch.address || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Capacity:</span>
              <span className="font-mono font-bold theme-text-primary">{branch.capacity || '—'}</span>
            </div>
          </div>
        </div>

        {!isCurrentActive && (
          <div className="pt-2 border-t theme-border">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetActiveBranch(branch);
              }}
              className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold theme-bg-sub hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary border theme-border transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <SleekCheckIcon className="w-3.5 h-3.5" />
              Make Active Campus
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full space-y-3.5">
      {/* ─── Compact Header & Switcher Row (Zero Background Box) ─── */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
          <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Campus Branches ({branches.length})
          </h5>
        </div>

        {/* Standard View Switcher Toggle Button */}
        <button
          type="button"
          onClick={() => handleViewModeChange(viewMode === 'grid' ? 'table' : 'grid')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
          title={viewMode === 'grid' ? 'Switch to Table View' : 'Switch to Cards View'}
        >
          {viewMode === 'grid' ? (
            <>
              <TableIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Table View</span>
            </>
          ) : (
            <>
              <Squares2X2Icon className="w-3.5 h-3.5 theme-accent" />
              <span>Cards View</span>
            </>
          )}
        </button>
      </div>

      {/* Main View Content (Table or Cards Grid) */}
      {viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={branches}
          loading={loading}
          loadingMessage="Loading academic branches..."
          keyExtractor={(b, idx) => b.id || `branch_${idx}`}
          cellPaddingClass="py-3.5 px-4 sm:px-5"
          headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
          emptyIcon={BuildingOfficeIcon}
          emptyTitle="No Branches Found"
          emptySubMessage="Get started by creating your first campus branch or facility."
          onRowClick={(branch) => handleOpenEdit(branch)}
        />
      ) : (
        <DataCardGrid
          data={branches}
          renderCard={renderBranchCard}
          isLoading={loading}
          loadingMessage="Loading academic branches..."
          emptyIcon={BuildingOfficeIcon}
          emptyTitle="No Branches Found"
          emptySubMessage="Get started by creating your first campus branch or facility."
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold theme-text-primary">Delete Branch</h3>
            <p className="text-xs theme-text-secondary">
              Are you sure you want to remove <span className="font-semibold theme-text-primary">"{deletingBranch.name}"</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
              <CustomButton
                type="button"
                variant="sub"
                size="md"
                onClick={() => setDeletingBranch(null)}
                disabled={isDeleting}
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="button"
                variant="danger-solid"
                size="md"
                onClick={confirmDelete}
                loading={isDeleting}
                loadingText="Deleting..."
              >
                Confirm Delete
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
