import React, { useState, useEffect, useCallback } from 'react';
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
  BookOpenIcon,
  CloseIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  ClassIcon,
} from '../../../components/ui/Icons';
import {
  getInstitutions,
  getInstitutionMetrics,
  deleteInstitution,
  updateInstitution,
} from '../../../api/institutions';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import InstitutionOnboardingForm from './InstitutionOnboardingForm';
import InstitutionEditForm from './InstitutionEditForm';

export default function InstitutionListView() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { switchInstitution, activeTenantId, isMultiTenantAdmin, refreshInstitutions } = useTenant();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

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
      const [instData, metricsData] = await Promise.all([
        getInstitutions({ search: searchQuery }),
        getInstitutionMetrics(),
      ]);

      const items = Array.isArray(instData) ? instData : (instData?.results || []);
      setInstitutions(items);
      if (metricsData) setMetrics(metricsData);
    } catch (err) {
      console.error('[Load Institutions Error]:', err);
      showToast('Failed to load institutions.', 'error');
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

  const handleOpenOnboarding = () => {
    openRightSidebar({
      title: 'Onboard New Academic Institution',
      width: 640,
      content: (
        <InstitutionOnboardingForm
          onSuccess={() => {
            loadData();
            refreshInstitutions();
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleOpenEdit = (inst) => {
    openRightSidebar({
      title: `Edit: ${inst.name}`,
      width: 620,
      content: (
        <InstitutionEditForm
          institution={inst}
          onSuccess={() => {
            loadData();
            refreshInstitutions();
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingInst) return;
    if (
      deleteConfirmText.trim() !== deletingInst.name.trim() ||
      !deleteAcknowledged ||
      !adminPassword.trim() ||
      deleteCountdown > 0
    ) {
      showToast('Please fulfill all security confirmation steps including your password.', 'warning');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteInstitution(deletingInst.id, { password: adminPassword.trim() });
      showToast(`Institution '${deletingInst.name}' has been safely decommissioned.`, 'success');
      setDeletingInst(null);
      loadData();
      refreshInstitutions();
    } catch (err) {
      console.error('[Delete Institution Error]:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to decommission institution.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200 theme-text-primary select-none font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xs">
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
              Academic Institution Management
            </h1>
          </div>
          <p className="text-xs theme-text-secondary mt-1">
            Enterprise multi-tenant directory, row-level data boundaries, and institution presets
          </p>
        </div>

        {isMultiTenantAdmin && (
          <button
            type="button"
            onClick={handleOpenOnboarding}
            className="px-5 py-2.5 rounded-2xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Onboard New Institution</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl theme-bg-elevated border theme-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <DepartmentIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black theme-text-primary">
              {metrics.total_institutions}
            </span>
            <p className="text-[11px] font-bold theme-text-secondary">Total Institutions</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl theme-bg-elevated border theme-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black theme-text-primary">
              {metrics.verified_institutions}
            </span>
            <p className="text-[11px] font-bold theme-text-secondary">Verified Tenants</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl theme-bg-elevated border theme-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black theme-text-primary">
              {metrics.total_active_students}
            </span>
            <p className="text-[11px] font-bold theme-text-secondary">Enrolled Students</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl theme-bg-elevated border theme-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black theme-text-primary">
              {metrics.total_staff}
            </span>
            <p className="text-[11px] font-bold theme-text-secondary">Active Staff & Admins</p>
          </div>
        </div>
      </div>

      {/* Filter, Search & View Toggle Bar */}
      <div className="p-3.5 rounded-2xl theme-bg-elevated border theme-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, slug, or district..."
            className="w-full pl-9 pr-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-main)]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
          >
            <option value="ALL">All Institution Types</option>
            <option value="MADRASA">Madrasa / Maktab</option>
            <option value="SCHOOL">General School</option>
            <option value="COLLEGE">College</option>
            <option value="COACHING">Coaching</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Dual Display Toggle */}
          <div className="flex items-center p-0.5 rounded-xl theme-bg-sub border theme-border">
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'theme-bg-elevated theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <BuildingOfficeIcon className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'theme-bg-elevated theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <DepartmentIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Institution List Display */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[var(--accent-main)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold theme-text-secondary">Loading academic institutions...</p>
        </div>
      ) : filteredInstitutions.length === 0 ? (
        <div className="py-16 px-4 rounded-3xl theme-bg-elevated border theme-border text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center mx-auto text-sky-400">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold theme-text-primary">No Institutions Found</h3>
          <p className="text-xs theme-text-secondary max-w-sm mx-auto">
            {searchQuery
              ? `No institutions matched '${searchQuery}'. Try adjusting your search query.`
              : 'Onboard your first isolated multi-tenant academic institution to get started.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* 1. Modern Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInstitutions.map((inst) => {
            const isCurrent = String(activeTenantId) === String(inst.id);
            return (
              <div
                key={inst.id}
                className={`rounded-3xl theme-bg-elevated border transition-all duration-200 overflow-hidden flex flex-col justify-between group ${
                  isCurrent
                    ? 'border-[var(--accent-main)] shadow-md ring-2 ring-[var(--accent-main)]/20'
                    : 'theme-border hover:theme-bg-sub/80 hover:shadow-lg'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar with Avatar, Name, Type, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center text-sky-400 font-bold text-base shrink-0 shadow-inner overflow-hidden">
                        {inst.logo_data || inst.logo_url ? (
                          <img src={inst.logo_data || inst.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          inst.name?.charAt(0).toUpperCase() || 'W'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold theme-text-primary text-sm truncate leading-tight">
                            {inst.name}
                          </h3>
                          {inst.is_verified && (
                            <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Academic Tenant" />
                          )}
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md theme-bg-sub border theme-border text-[10px] font-mono text-sky-400 font-bold">
                          {inst.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-xl theme-bg-sub border theme-border text-[10px] font-medium theme-text-secondary">
                        {inst.institution_type}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          inst.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${inst.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {inst.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="text-xs space-y-1.5 theme-text-secondary pt-2 border-t theme-border">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Contact Phone:</span>
                      <span className="theme-text-primary font-mono font-bold">{inst.phone || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Location / District:</span>
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
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl theme-bg-app border theme-border text-center">
                    <div>
                      <span className="block text-sm font-black text-sky-400">{inst.total_students_count ?? 0}</span>
                      <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-bold">Students</span>
                    </div>
                    <div className="border-x theme-border">
                      <span className="block text-sm font-black theme-text-primary">{inst.total_classes_count ?? 0}</span>
                      <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-bold">Classes</span>
                    </div>
                    <div>
                      <span className="block text-sm font-black theme-text-primary">{inst.total_staff_count ?? 0}</span>
                      <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-bold">Staff</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3.5 border-t theme-border theme-bg-sub/60 flex items-center justify-between gap-2">
                  {isMultiTenantAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSwitchContext(inst)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                          : 'theme-bg-elevated hover:theme-bg-app theme-text-primary border theme-border'
                      }`}
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>{isCurrent ? 'Active Context' : 'Switch Context'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(inst)}
                      className="p-2 rounded-xl theme-bg-elevated hover:theme-bg-app theme-text-secondary hover:theme-text-primary border theme-border transition cursor-pointer shadow-xs"
                      title="Edit Institution Profile"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(inst)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer shadow-xs"
                      title="Decommission Institution"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. High-Density Table View */
        <div className="rounded-3xl theme-bg-elevated border theme-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border theme-bg-sub/80 text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="px-5 py-3.5">Institution Profile</th>
                  <th className="px-5 py-3.5">Type & Reg.</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5 text-center">Students</th>
                  <th className="px-5 py-3.5 text-center">Classes</th>
                  <th className="px-5 py-3.5 text-center">Staff</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filteredInstitutions.map((inst) => {
                  const isCurrent = String(activeTenantId) === String(inst.id);
                  return (
                    <tr
                      key={inst.id}
                      className={`hover:theme-bg-sub/60 transition-colors ${
                        isCurrent ? 'bg-sky-500/5' : ''
                      }`}
                    >
                      {/* Name & Slug */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl theme-bg-sub border theme-border flex items-center justify-center font-bold text-sky-400 text-xs shrink-0 overflow-hidden">
                            {inst.logo_data || inst.logo_url ? (
                              <img src={inst.logo_data || inst.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              inst.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold theme-text-primary flex items-center gap-1.5">
                              <span>{inst.name}</span>
                              {inst.is_verified && (
                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-sky-400">
                              {inst.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type & EIIN */}
                      <td className="px-5 py-3.5">
                        <div className="font-medium theme-text-primary">{inst.institution_type}</div>
                        {inst.eiin_or_reg_no && (
                          <div className="text-[10px] theme-text-secondary font-mono">
                            EIIN: {inst.eiin_or_reg_no}
                          </div>
                        )}
                      </td>

                      {/* Phone & District */}
                      <td className="px-5 py-3.5">
                        <div className="theme-text-primary font-mono">{inst.phone || '--'}</div>
                        <div className="text-[10px] theme-text-secondary">
                          {inst.district || inst.division || 'Bangladesh'}
                        </div>
                      </td>

                      {/* Counts */}
                      <td className="px-5 py-3.5 text-center font-bold text-sky-400">
                        {inst.total_students_count ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold theme-text-primary">
                        {inst.total_classes_count ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold theme-text-primary">
                        {inst.total_staff_count ?? 0}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inst.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${inst.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {inst.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isMultiTenantAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSwitchContext(inst)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border'
                              }`}
                              title="Set this institution as active workspace context"
                            >
                              {isCurrent ? 'Active Context' : 'Switch Context'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(inst)}
                            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent cursor-pointer"
                            title="Edit Institution Details"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(inst)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition border-0 bg-transparent cursor-pointer"
                            title="Decommission / Delete Institution"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
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

      {/* Enterprise-Grade High-Security Decommission Safety Barrier Modal (Portaled to root with z-[9999]) */}
      {deletingInst && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-lg rounded-3xl theme-bg-elevated border border-rose-500/40 shadow-2xl p-6 sm:p-7 space-y-5 animate-zoom-in">
            {/* Header with Hazard Icon */}
            <div className="flex items-start gap-3.5 pb-4 border-b theme-border">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                <AlertTriangleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-400 tracking-tight">
                  High-Risk Action: Decommission Institution
                </h3>
                <p className="text-xs theme-text-secondary mt-0.5 leading-relaxed">
                  You are about to isolate and decommission institutional tenant <strong className="theme-text-primary">"{deletingInst.name}"</strong>.
                </p>
              </div>
            </div>

            {/* Danger Impact Summary */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️ What will happen upon decommissioning:</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-200/90 leading-relaxed">
                <li>All active academic classes, sections, and department configurations will be frozen.</li>
                <li>Enrolled student attendance matrices, exam reports, and grades will be isolated.</li>
                <li>Teacher and staff access credentials under this tenant domain will be deactivated.</li>
              </ul>
            </div>

            {/* Step 1: Acknowledgment Checkbox */}
            <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-start gap-3">
              <input
                type="checkbox"
                id="decommission_ack"
                checked={deleteAcknowledged}
                onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 theme-bg-elevated theme-border cursor-pointer shrink-0"
              />
              <label htmlFor="decommission_ack" className="text-xs font-semibold theme-text-primary cursor-pointer leading-relaxed">
                I acknowledge the consequences and confirm that I wish to permanently decommission this institution.
              </label>
            </div>

            {/* Step 2: Verification Input Matching Exact Name */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Type <span className="theme-text-primary font-mono font-bold select-all bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{deletingInst.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Enter exact institution name to unlock"
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Step 3: Admin Account Password Authorization */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Your Admin Account Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your account login password to authorize"
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t theme-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDeletingInst(null)}
                className="px-5 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              >
                Cancel &amp; Keep Safe
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={
                  isDeleting ||
                  deleteConfirmText.trim() !== deletingInst.name.trim() ||
                  !deleteAcknowledged ||
                  !adminPassword.trim() ||
                  deleteCountdown > 0
                }
                className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Decommissioning...</span>
                  </>
                ) : deleteCountdown > 0 ? (
                  <span>Hold Safety ({deleteCountdown}s)</span>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    <span>Confirm Permanent Decommission</span>
                  </>
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
