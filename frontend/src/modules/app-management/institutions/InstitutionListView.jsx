import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  DepartmentIcon,
  SearchIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TrashIcon,
  EditIcon,
  UsersIcon,
  CloseIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  ClassIcon,
  MoreVerticalIcon,
} from '../../../components/ui/Icons';
import DataTable from '../../../components/ui/DataTable';
import DataCardGrid from '../../../components/ui/DataCardGrid';
import ActionMenu from '../../../components/ui/ActionMenu';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import PageHeader from '../../../components/ui/PageHeader';
import DataViewToolbar from '../../../components/ui/DataViewToolbar';
import DataViewFooter from '../../../components/ui/DataViewFooter';
import {
  getInstitutions,
  getInstitutionMetrics,
  deleteInstitution,
  getInstitutionCategories,
} from '../../../api/institutions';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import InstitutionOnboardingForm from './InstitutionOnboardingForm';
import InstitutionEditForm from './InstitutionEditForm';

export default function InstitutionListView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { switchInstitution, activeTenantId, isMultiTenantAdmin, refreshInstitutions, currentInstitution } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('spr_inst_view_mode') || 'grid';
  });

  const [institutions, setInstitutions] = useState([]);
  const [metrics, setMetrics] = useState({
    total_institutions: 0,
    verified_institutions: 0,
    total_active_students: 0,
    total_staff: 0,
  });
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);

  // High-Security Delete Confirmation State
  const [deletingInst, setDeletingInst] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState(3);

  const handleOpenDelete = (inst) => {
    setDeletingInst(inst);
    setDeleteConfirmText('');
    setDeleteAcknowledged(false);
    setAdminPassword('');
    setDeleteCountdown(3);
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
    let timer;
    if (deletingInst && deleteCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [deletingInst, deleteCountdown]);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_inst_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [instData, metricsData, catsData] = await Promise.allSettled([
        getInstitutions({ search: searchQuery }),
        getInstitutionMetrics(),
        getInstitutionCategories(),
      ]);

      if (instData.status === 'fulfilled') {
        const val = instData.value;
        const items = Array.isArray(val) ? val : val?.results || [];
        setInstitutions(items);
      }
      if (metricsData.status === 'fulfilled' && metricsData.value) {
        setMetrics(metricsData.value);
      }
      if (catsData.status === 'fulfilled' && Array.isArray(catsData.value)) {
        setCategories(catsData.value);
      }
    } catch (err) {
      console.error('[Load Academies Error]:', err);
      showToast(err.message || 'Failed to load academies.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredInstitutions = institutions.filter((inst) => {
    if (typeFilter !== 'ALL' && inst.institution_type !== typeFilter) return false;
    return true;
  });

  const handleSwitchContext = (inst) => {
    switchInstitution(inst.id);
    showToast(`Switched active workspace to ${inst.name}`, 'success');
  };

  // Universal Drawer Registration for Institution Form (survives F5 refresh)
  useDrawerRegistration(
    'institution',
    (params) => {
      const mode = params.get('mode') || 'add';
      const instId = params.get('id');
      const foundInst = instId ? institutions.find((i) => String(i.id) === String(instId)) : null;

      if (mode === 'edit') {
        return {
          title: `Edit: ${foundInst?.name || 'Academy'}`,
          category: 'Institutions',
          size: 'md',
          content: (
            <InstitutionEditForm
              institution={foundInst}
              onSuccess={() => {
                loadData();
                refreshInstitutions();
                closeDrawer();
              }}
              onCancel={closeDrawer}
            />
          ),
        };
      }

      return {
        title: 'Onboard New Academy',
        category: 'Institutions',
        size: 'md',
        content: (
          <InstitutionOnboardingForm
            onSuccess={() => {
              loadData();
              refreshInstitutions();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [institutions, loadData, refreshInstitutions, closeDrawer]
  );

  const handleOpenOnboarding = () => {
    openDrawer('institution', { mode: 'add' });
  };

  const handleOpenEdit = (inst) => {
    openDrawer('institution', { mode: 'edit', id: inst.id });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingInst) return;
    if (
      deleteConfirmText.trim() !== deletingInst.name.trim() ||
      !deleteAcknowledged ||
      deleteCountdown > 0
    ) {
      showToast('Please type the full academy name and acknowledge data risk to confirm.', 'warning');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteInstitution(deletingInst.id, {
        password: adminPassword || undefined,
      });

      showToast(`Academy "${deletingInst.name}" has been decommissioned.`, 'success');
      setDeletingInst(null);
      loadData();
      refreshInstitutions();
    } catch (err) {
      console.error('[Decommission Error]:', err);
      showToast(err.message || 'Decommission authorization failed. Please check administrator password.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryLabel = (typeCode) => {
    const found = categories.find((c) => c.code === typeCode);
    return found?.name || typeCode || 'Madrasa / Maktab';
  };

  // Reusable Action Items generator
  const getActionMenuItems = (inst) => [
    {
      label: 'Switch Active Context',
      icon: CheckCircleIcon,
      onClick: () => handleSwitchContext(inst),
      hidden: !isMultiTenantAdmin,
    },
    {
      label: 'Edit Academy Profile',
      icon: EditIcon,
      onClick: () => handleOpenEdit(inst),
    },
    {
      divider: true,
    },
    {
      label: 'Decommission Academy',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleOpenDelete(inst),
    },
  ];

  // Reusable DataTable Columns
  const tableColumns = [
    {
      key: 'name',
      header: 'Academy Profile',
      headerClassName: 'min-w-[220px]',
      render: (inst) => {
        const isCurrent = String(activeTenantId) === String(inst.id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl theme-bg-sub border theme-border flex items-center justify-center font-bold text-xs theme-accent shrink-0 overflow-hidden shadow-xs">
              {inst.logo_data || inst.logo_url ? (
                <img src={inst.logo_data || inst.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                inst.name?.charAt(0).toUpperCase() || 'A'
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold theme-text-primary flex items-center gap-1.5 flex-wrap">
                <span className="break-words leading-tight">{inst.name}</span>
                {inst.is_verified && (
                  <CheckCircleIcon className="w-3.5 h-3.5 theme-accent shrink-0" title="Verified Academy" />
                )}
                {isCurrent && (
                  <span className="px-1.5 py-0.2 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 text-[9px] font-bold">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'institution_type',
      header: 'Category & Reg.',
      headerClassName: 'min-w-[150px]',
      render: (inst) => (
        <div>
          <div className="font-semibold theme-text-primary text-xs">{getCategoryLabel(inst.institution_type)}</div>
          {inst.eiin_or_reg_no && (
            <div className="text-[10px] theme-text-secondary font-mono mt-0.5">
              Reg: {inst.eiin_or_reg_no}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact Details',
      headerClassName: 'min-w-[160px]',
      render: (inst) => (
        <div>
          <div className="theme-text-primary font-mono text-xs">{inst.phone || '--'}</div>
          <div className="text-[10px] theme-text-secondary mt-0.5">
            {inst.district || inst.division || 'Bangladesh'}
          </div>
        </div>
      ),
    },
    {
      key: 'total_students_count',
      header: 'Students',
      align: 'center',
      headerClassName: 'w-20 text-center',
      render: (inst) => (
        <span className="font-bold theme-accent">{inst.total_students_count ?? 0}</span>
      ),
    },
    {
      key: 'total_classes_count',
      header: 'Classes',
      align: 'center',
      headerClassName: 'w-20 text-center',
      render: (inst) => (
        <span className="font-bold theme-text-primary">{inst.total_classes_count ?? 0}</span>
      ),
    },
    {
      key: 'total_staff_count',
      header: 'Staff',
      align: 'center',
      headerClassName: 'w-20 text-center',
      render: (inst) => (
        <span className="font-bold theme-text-primary">{inst.total_staff_count ?? 0}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      align: 'center',
      headerClassName: 'w-24 text-center',
      render: (inst) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            inst.is_active
              ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
              : 'theme-bg-sub theme-text-secondary border theme-border'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${inst.is_active ? 'bg-[var(--accent-main)]' : 'theme-bg-elevated'}`}></span>
          {inst.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (inst) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(inst)} />
        </div>
      ),
    },
  ];

  // Reusable Card Renderer for DataCardGrid
  const renderAcademyCard = (inst) => {
    const isCurrent = String(activeTenantId) === String(inst.id);
    return (
      <div
        key={inst.id}
        className={`rounded-2xl theme-bg-surface border transition-all duration-150 overflow-hidden flex flex-col justify-between group shadow-xs ${
          isCurrent
            ? 'border-[var(--accent-main)] ring-2 ring-[var(--accent-main)]/20'
            : 'theme-border hover:theme-bg-sub/30'
        }`}
      >
        <div className="p-5 space-y-4">
          {/* Top Bar with Avatar, Name, Type, Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center theme-accent font-bold text-sm shrink-0 overflow-hidden shadow-xs">
                {inst.logo_data || inst.logo_url ? (
                  <img src={inst.logo_data || inst.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  inst.name?.charAt(0).toUpperCase() || 'A'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5 flex-wrap">
                  <h3 className="font-bold theme-text-primary text-sm leading-tight break-words">
                    {inst.name}
                  </h3>
                  {inst.is_verified && (
                    <CheckCircleIcon className="w-3.5 h-3.5 theme-accent shrink-0 mt-0.5" title="Verified Academy" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="px-2 py-0.5 rounded-lg theme-bg-sub border theme-border text-[10px] font-medium theme-text-secondary">
                {getCategoryLabel(inst.institution_type)}
              </span>
              {!inst.is_active && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border theme-bg-sub theme-text-secondary border theme-border">
                  <span className="w-1.5 h-1.5 rounded-full theme-bg-elevated"></span>
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* Contact info */}
          <div className="text-xs space-y-1.5 theme-text-secondary pt-2.5 border-t theme-border">
            <div className="flex items-center justify-between text-[11px]">
              <span>Contact Phone:</span>
              <span className="theme-text-primary font-mono font-semibold">{inst.phone || '--'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Campus Location:</span>
              <span className="theme-text-primary font-medium">{inst.district || inst.division || 'Bangladesh'}</span>
            </div>
            {inst.eiin_or_reg_no && (
              <div className="flex items-center justify-between text-[11px]">
                <span>Govt. Reg / EIIN:</span>
                <span className="theme-text-primary font-mono">{inst.eiin_or_reg_no}</span>
              </div>
            )}
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
            <div>
              <span className="block text-sm font-bold theme-accent">{inst.total_students_count ?? 0}</span>
              <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Students</span>
            </div>
            <div className="border-x theme-border">
              <span className="block text-sm font-bold theme-text-primary">{inst.total_classes_count ?? 0}</span>
              <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Classes</span>
            </div>
            <div>
              <span className="block text-sm font-bold theme-text-primary">{inst.total_staff_count ?? 0}</span>
              <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Staff</span>
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="px-5 py-3 border-t theme-border theme-bg-sub/40 flex items-center justify-between gap-2">
          {isMultiTenantAdmin ? (
            <button
              type="button"
              onClick={() => handleSwitchContext(inst)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isCurrent
                  ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 shadow-xs'
                  : 'theme-bg-surface hover:theme-bg-sub theme-text-primary border theme-border'
              }`}
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>{isCurrent ? 'Current Workspace' : 'Switch Context'}</span>
            </button>
          ) : (
            <span className="text-[11px] theme-text-secondary font-medium">Academy Tenant</span>
          )}

          <ActionMenu items={getActionMenuItems(inst)} />
        </div>
      </div>
    );
  };

  return (
    <div className={`${isEmbedded ? 'w-full space-y-6 font-sans theme-text-primary animate-fade-in text-left' : 'w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 font-sans theme-text-primary animate-fade-in text-left'}`}>
      {/* 1. Header Overview & Primary Action with Reusable PageHeader */}
      {!hideHeader && (
        <PageHeader
          icon={BuildingOfficeIcon}
          title="Academies"
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-secondary tracking-wide">
              Multi-Tenant
            </span>
          }
          subtitle="Multi-tenant academic workspace directory & isolated database branches"
          actions={
            isMultiTenantAdmin && (
              <button
                type="button"
                onClick={handleOpenOnboarding}
                className="px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Onboard Academy</span>
              </button>
            )
          }
        />
      )}

      {/* 2. Top Metric Cards */}
      {!hideMetrics && (
        <MetricsGrid
          items={[
            {
              label: 'Total Academies',
              value: metrics.total_institutions,
              icon: BuildingOfficeIcon,
              color: 'default',
            },
            {
              label: 'Verified Campuses',
              value: metrics.verified_institutions,
              icon: CheckCircleIcon,
              color: 'accent',
            },
            {
              label: 'Active Students',
              value: metrics.total_active_students,
              icon: UsersIcon,
              color: 'default',
            },
            {
              label: 'Faculty & Staff',
              value: metrics.total_staff,
              icon: DepartmentIcon,
              color: 'default',
            },
          ]}
        />
      )}

      {/* 3. Search & View Mode Switcher Toolbar */}
      <DataViewToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search academies by name, slug, phone..."
        filterElement={
          <CustomSelect
            size="sm"
            searchable={false}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={[
              { value: 'ALL', label: 'All Academy Types' },
              ...categories.map((c) => ({ value: c.code, label: c.name })),
            ]}
            placeholder="All Academy Types"
          />
        }
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* 4. Display: Reusable DataCardGrid or DataTable */}
      <div className="space-y-4">
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold theme-text-primary">
              {selectedIds.length} {selectedIds.length === 1 ? 'academy' : 'academies'} selected
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
            data={filteredInstitutions}
            renderCard={renderAcademyCard}
            isLoading={isLoading}
            loadingMessage="Loading academies..."
            emptyIcon={BuildingOfficeIcon}
            emptyTitle="No Academies Found"
            emptySubMessage={
              searchQuery
                ? `No academies matched "${searchQuery}". Try adjusting your search query.`
                : 'Onboard your first multi-tenant academy to get started.'
            }
          />
        ) : (
          <DataTable
            columns={tableColumns}
            data={filteredInstitutions}
            selectable={true}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            idField="id"
            isLoading={isLoading}
            loadingMessage="Loading academies table..."
            emptyIcon={BuildingOfficeIcon}
            emptyTitle="No Academies Found"
            emptySubMessage={
              searchQuery
                ? `No academies matched "${searchQuery}". Try adjusting your search query.`
                : 'Onboard your first multi-tenant academy to get started.'
            }
          />
        )}

        {/* Reusable DataViewFooter */}
        {!isLoading && institutions.length > 0 && (
          <DataViewFooter
            filteredCount={filteredInstitutions.length}
            totalCount={institutions.length}
            itemLabel="academies & organizations"
          />
        )}
      </div>

      {/* 5. High-Security Delete Confirmation Modal (Native Portal) */}
      {deletingInst &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md theme-bg-surface border theme-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-in text-left">
              {/* Header */}
              <div className="flex items-center gap-3 text-rose-400 pb-3 border-b theme-border">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold theme-text-primary">Decommission Academy</h3>
                  <p className="text-xs theme-text-secondary">Irreversible Multi-Tenant Action</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1.5 leading-relaxed">
                <p className="font-bold">⚠️ Warning: Complete Data Isolation Deletion</p>
                <p className="text-[11px] opacity-90">
                  You are about to decommission <strong className="text-white font-bold">{deletingInst.name}</strong> ({deletingInst.slug}). All associated students, classes, and records will be permanently archived.
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <CustomInput
                    label="Type Academy Name to Confirm:"
                    value={deleteConfirmText}
                    onChange={(val) => setDeleteConfirmText(val)}
                    placeholder={deletingInst.name}
                  />
                </div>

                <div>
                  <CustomInput
                    type="password"
                    label="Master Administrator Password:"
                    value={adminPassword}
                    onChange={(val) => setAdminPassword(val)}
                    placeholder="Enter security password"
                  />
                </div>

                <div className="pt-1">
                  <CustomCheckbox
                    id="ack_decom"
                    checked={deleteAcknowledged}
                    onChange={(checked) => setDeleteAcknowledged(checked)}
                    label="I acknowledge that decommissioning this academy will suspend all active student portals immediately."
                    size="sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setDeletingInst(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={
                    isDeleting ||
                    deleteCountdown > 0 ||
                    deleteConfirmText.trim() !== deletingInst.name.trim() ||
                    !deleteAcknowledged
                  }
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <span>Decommissioning...</span>
                  ) : deleteCountdown > 0 ? (
                    <span>Wait ({deleteCountdown}s)</span>
                  ) : (
                    <span>Confirm Decommission</span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
