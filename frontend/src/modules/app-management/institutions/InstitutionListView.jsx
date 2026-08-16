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
import InstitutionOnboardingDrawer from './InstitutionOnboardingDrawer';
import InstitutionEditDrawer from './InstitutionEditDrawer';

export default function InstitutionListView() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { switchInstitution, activeTenantId, isMultiTenantAdmin, refreshInstitutions } = useTenant();

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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Edit Modal State
  const [editingInst, setEditingInst] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirmation State
  const [deletingInst, setDeletingInst] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      console.error('[InstitutionListView] Error loading data:', err);
      showToast(err.message || 'Failed to load institutions directory.', 'error');
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingInst) return;
    try {
      setIsUpdating(true);
      await updateInstitution(editingInst.id, {
        name: editingInst.name,
        bangla_name: editingInst.bangla_name,
        phone: editingInst.phone,
        email: editingInst.email,
        district: editingInst.district,
        address: editingInst.address,
        institution_type: editingInst.institution_type,
        eiin_or_reg_no: editingInst.eiin_or_reg_no,
      });
      showToast('Institution updated successfully!', 'success');
      setEditingInst(null);
      loadData();
      refreshInstitutions();
    } catch (err) {
      console.error('[Update Institution Error]:', err);
      showToast(err.response?.data?.error || 'Failed to update institution.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingInst) return;
    try {
      setIsDeleting(true);
      await deleteInstitution(deletingInst.id);
      showToast(`Institution '${deletingInst.name}' has been decommissioned.`, 'success');
      setDeletingInst(null);
      loadData();
      refreshInstitutions();
    } catch (err) {
      console.error('[Delete Institution Error]:', err);
      showToast(err.response?.data?.error || 'Failed to decommission institution.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xs">
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
            onClick={() => setIsOnboardingOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-sky-500/20 transition cursor-pointer flex items-center gap-2"
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
            className="w-full pl-9 pr-3 py-1.5 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary placeholder-zinc-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'theme-bg-elevated theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
              title="Modern Grid Cards View"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'theme-bg-elevated theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
              title="High-Density Table View"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center theme-text-secondary rounded-2xl theme-bg-elevated border theme-border flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Loading institutions directory...</span>
        </div>
      ) : filteredInstitutions.length === 0 ? (
        <div className="py-16 px-4 text-center theme-text-secondary rounded-2xl theme-bg-elevated border theme-border flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">No Institutions Found</h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              {searchQuery ? 'Try adjusting your search terms or filter criteria.' : 'Get started by onboarding your first academic institution.'}
            </p>
          </div>
          {isMultiTenantAdmin && (
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Onboard Institution</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* 1. Modern Grid Cards View (Default) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInstitutions.map((inst) => {
            const isCurrent = String(activeTenantId) === String(inst.id);
            return (
              <div
                key={inst.id}
                className={`rounded-2xl theme-bg-elevated border transition-all duration-200 overflow-hidden flex flex-col justify-between group ${
                  isCurrent
                    ? 'border-sky-500/50 shadow-md ring-2 ring-sky-500/20'
                    : 'theme-border hover:border-zinc-700 hover:shadow-lg'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar with Avatar, Name, Type, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-base shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {inst.logo_url ? (
                          <img src={inst.logo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
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
                        {inst.bangla_name && (
                          <p className="text-xs theme-text-secondary truncate mt-0.5">{inst.bangla_name}</p>
                        )}
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-400">
                          {inst.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-medium">
                        {inst.institution_type}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
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
                  <div className="text-xs space-y-1 theme-text-secondary pt-1 border-t theme-border">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Contact Phone:</span>
                      <span className="theme-text-primary font-mono">{inst.phone || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Location / District:</span>
                      <span className="theme-text-primary">{inst.district || 'Bangladesh'}</span>
                    </div>
                    {inst.eiin_or_reg_no && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Govt. Reg / EIIN:</span>
                        <span className="theme-text-primary font-mono">{inst.eiin_or_reg_no}</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl theme-bg-app border theme-border text-center">
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
                <div className="px-5 py-3 border-t theme-border theme-bg-sub/60 flex items-center justify-between gap-2">
                  {isMultiTenantAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSwitchContext(inst)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                          : 'theme-bg-elevated hover:bg-sky-500/20 theme-text-primary hover:text-sky-300 border theme-border'
                      }`}
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>{isCurrent ? 'Active Context' : 'Switch Context'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setEditingInst(inst)}
                      className="p-2 rounded-xl theme-bg-elevated hover:theme-bg-app theme-text-secondary hover:theme-text-primary border theme-border transition cursor-pointer shadow-xs"
                      title="Edit Institution Profile"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingInst(inst)}
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
        <div className="rounded-2xl theme-bg-elevated border theme-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border theme-bg-sub text-[11px] font-bold theme-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">Identifier / Slug</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4 text-center">Students</th>
                  <th className="py-3 px-4 text-center">Classes</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filteredInstitutions.map((inst) => {
                  const isCurrent = String(activeTenantId) === String(inst.id);
                  return (
                    <tr
                      key={inst.id}
                      className={`hover:theme-bg-sub/50 transition-colors ${isCurrent ? 'bg-sky-500/5' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center font-bold text-sky-400 shrink-0">
                            {inst.logo_url ? (
                              <img src={inst.logo_url} alt="" className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              inst.name?.charAt(0).toUpperCase() || 'W'
                            )}
                          </div>
                          <div>
                            <div className="font-bold theme-text-primary flex items-center gap-1.5">
                              <span>{inst.name}</span>
                              {inst.is_verified && (
                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Academic Tenant" />
                              )}
                            </div>
                            {inst.bangla_name && (
                              <div className="text-[11px] theme-text-secondary">{inst.bangla_name}</div>
                            )}
                            {inst.eiin_or_reg_no && (
                              <div className="text-[10px] theme-text-secondary font-mono">
                                Reg: {inst.eiin_or_reg_no}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 font-mono text-[11px] text-sky-400">
                          {inst.slug}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium text-[10px]">
                          {inst.institution_type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="theme-text-primary font-medium">{inst.phone || '--'}</div>
                        <div className="text-[10px] theme-text-secondary">{inst.district || 'Bangladesh'}</div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-sky-400">
                        {inst.total_students_count ?? '--'}
                      </td>

                      <td className="py-3 px-4 text-center font-bold theme-text-primary">
                        {inst.total_classes_count ?? '--'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inst.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              inst.is_active ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          ></span>
                          {inst.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isMultiTenantAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSwitchContext(inst)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'theme-bg-sub hover:bg-sky-500/20 theme-text-primary hover:text-sky-300 border theme-border'
                              }`}
                              title="Set this institution as active workspace context"
                            >
                              {isCurrent ? 'Active Context' : 'Switch Context'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingInst(inst)}
                            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent cursor-pointer"
                            title="Edit Institution Details"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingInst(inst)}
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

      {/* Onboarding Right Sidebar Drawer */}
      <InstitutionOnboardingDrawer
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={() => {
          loadData();
          refreshInstitutions();
        }}
      />

      {/* Edit Institution Right Sidebar Drawer */}
      <InstitutionEditDrawer
        isOpen={Boolean(editingInst)}
        onClose={() => setEditingInst(null)}
        institution={editingInst}
        onUpdated={() => {
          loadData();
          refreshInstitutions();
        }}
      />

      {/* Delete / Decommission Modal */}
      {deletingInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl theme-bg-elevated border theme-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangleIcon className="w-6 h-6" />
              <h3 className="text-base font-bold theme-text-primary">Decommission Institution</h3>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Are you sure you want to decommission{' '}
              <strong className="theme-text-primary">{deletingInst.name}</strong>? All associated
              academic departments, classes, and records will be isolated.
            </p>
            <div className="pt-3 border-t theme-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingInst(null)}
                className="px-4 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Decommission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
