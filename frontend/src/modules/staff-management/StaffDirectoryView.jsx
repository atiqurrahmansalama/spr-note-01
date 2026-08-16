import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TeacherIcon,
  AttendanceIcon,
  LeaveIcon,
  DutyIcon,
  SearchIcon,
  PlusIcon,
  QrCodeIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  PhoneIcon,
  MailIcon,
  RefreshIcon,
  ClassIcon,
  BuildingOfficeIcon,
  BankIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import { getStaffList, getStaffMetrics, deleteStaff } from '../../api/staff';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { fetchWithAuth } from '../../utils/authService';

import StaffFormModal from './StaffFormModal';
import StaffInviteModal from './StaffInviteModal';
import TeacherAssignmentModal from './TeacherAssignmentModal';
import GeneralDutyModal from './GeneralDutyModal';

export default function StaffDirectoryView() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('spr_staff_view_mode') || 'grid';
  });

  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [metrics, setMetrics] = useState({
    total_staff: 0,
    teaching_staff: 0,
    general_staff: 0,
    active_staff: 0,
    permanent_staff: 0,
    on_leave_today: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState('ALL'); // ALL, TEACHING, NON_TEACHING
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showTrash, setShowTrash] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [assignmentTeacher, setAssignmentTeacher] = useState(null);
  const [dutyStaff, setDutyStaff] = useState(null);

  // Soft-delete confirm state
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch departments lookup
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/departments/');
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.warn('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, [activeTenantId]);

  // Load Staff List & Metrics
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const params = {
        search: searchQuery.trim(),
        department: deptFilter,
        employment_status: statusFilter,
        trash: showTrash ? 'true' : undefined,
      };

      if (staffTypeFilter === 'TEACHING') {
        params.staff_type = 'TEACHING';
      } else if (staffTypeFilter === 'NON_TEACHING') {
        params.staff_type = 'SUPPORT'; // backend filter
      }

      const [listRes, metricsRes] = await Promise.all([
        getStaffList(params),
        getStaffMetrics(),
      ]);

      const items = Array.isArray(listRes) ? listRes : listRes.results || [];
      setStaffList(items);
      setMetrics(metricsRes);
    } catch (err) {
      console.error('Failed to load staff list:', err);
      showToast(err.message || 'Failed to load staff directory', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, staffTypeFilter, deptFilter, statusFilter, showTrash, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTenantId]);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('spr_staff_view_mode', mode);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setIsFormOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      await deleteStaff(deletingStaff.id);
      showToast(`Staff member '${deletingStaff.employee_id}' has been soft-deleted.`, 'success');
      setDeletingStaff(null);
      loadData(true);
    } catch (err) {
      showToast(err.message || 'Failed to soft-delete staff member', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* 1. Header & Navigation Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
              <TeacherIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2">
                Teacher & Staff Management
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                  Multi-Tenant
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Faculty directory, academic class assignments, attendance punching, and leave desk
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Refresh Directory"
          >
            <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/staff/attendance')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <AttendanceIcon className="w-4 h-4 text-emerald-400" />
            <span>Attendance Sheet</span>
          </button>

          <button
            onClick={() => navigate('/staff/leaves')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <LeaveIcon className="w-4 h-4 text-amber-400" />
            <span>Leave Desk</span>
          </button>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <QrCodeIcon className="w-4 h-4" />
            <span>Invite via QR</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Total Staff */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TeacherIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{metrics.total_staff || 0}</div>
            <div className="text-[11px] font-medium text-zinc-400">Total Employees</div>
          </div>
        </div>

        {/* Teaching Faculty */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-400">{metrics.teaching_staff || 0}</div>
            <div className="text-[11px] font-medium text-zinc-400">Teaching Faculty</div>
          </div>
        </div>

        {/* Non-Academic Operations */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BuildingOfficeIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{metrics.general_staff || 0}</div>
            <div className="text-[11px] font-medium text-zinc-400">General Operations</div>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <LeaveIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{metrics.on_leave_today || 0}</div>
            <div className="text-[11px] font-medium text-zinc-400">On Leave Today</div>
          </div>
        </div>
      </div>

      {/* 3. Search, Segmented Filters & Display Modes */}
      <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Category Buttons */}
          <div className="inline-flex p-1 rounded-xl bg-zinc-950 border border-zinc-800 self-start">
            <button
              onClick={() => setStaffTypeFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                staffTypeFilter === 'ALL'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Staff ({metrics.total_staff || 0})
            </button>
            <button
              onClick={() => setStaffTypeFilter('TEACHING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                staffTypeFilter === 'TEACHING'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Teaching ({metrics.teaching_staff || 0})
            </button>
            <button
              onClick={() => setStaffTypeFilter('NON_TEACHING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                staffTypeFilter === 'NON_TEACHING'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Non-Academic ({metrics.general_staff || 0})
            </button>
          </div>

          {/* Search and Secondary Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search staff, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-sky-500 placeholder-zinc-500"
              />
            </div>

            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Employment Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PERMANENT">Permanent</option>
              <option value="PROBATION">Probation</option>
              <option value="CONTRACT">Contractual</option>
              <option value="PART_TIME">Part Time</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
            </select>

            {/* Trash Toggle */}
            <button
              onClick={() => setShowTrash(!showTrash)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showTrash
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {showTrash ? 'Viewing Trash' : 'Trash'}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
              <button
                onClick={() => handleToggleViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Grid Cards"
              >
                Cards
              </button>
              <button
                onClick={() => handleToggleViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Table List"
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Staff Content (Cards or Table) */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium">Loading staff directory...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 flex flex-col items-center justify-center gap-3">
          <div className="p-4 rounded-2xl bg-zinc-800/50 text-zinc-400">
            <TeacherIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200">No Staff Members Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            {searchQuery || staffTypeFilter !== 'ALL' || deptFilter !== 'ALL'
              ? 'No records match your active search filters.'
              : 'Start by adding teaching faculty or onboarding staff via invite token.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Staff Profile</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS DISPLAY */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((staff) => {
            const isTeaching = staff.staff_type === 'TEACHING';
            const initials = staff.user_name
              ? staff.user_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
              : staff.employee_id?.slice(0, 2) || 'ST';

            return (
              <div
                key={staff.id}
                className="group relative rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 p-5 transition-all hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header & Avatar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner ${
                        isTeaching
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {initials}
                      </div>
                      <div>
                        <h3
                          onClick={() => navigate(`/staff/${staff.id}`)}
                          className="text-sm font-semibold text-zinc-100 group-hover:text-sky-400 transition-colors cursor-pointer"
                        >
                          {staff.user_name || 'Staff Profile'}
                        </h3>
                        <div className="text-xs text-zinc-400">{staff.designation}</div>
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          ID: <span className="text-zinc-300 font-semibold">{staff.employee_id}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      staff.employment_status === 'PERMANENT'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : staff.employment_status === 'PROBATION'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {staff.employment_status}
                    </span>
                  </div>

                  {/* Attributes & Metadata */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Department:</span>
                      <span className="text-zinc-200 font-medium">{staff.department_name || 'General / Unassigned'}</span>
                    </div>

                    {isTeaching ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Specialization:</span>
                          <span className="text-zinc-200 font-medium truncate max-w-[160px]">
                            {staff.teacher_detail?.specialization || 'General Teaching'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Active Classes:</span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono text-[11px] font-semibold">
                            {staff.active_assignments_count || 0} Assigned
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Assigned Zone:</span>
                          <span className="text-zinc-200 font-medium">
                            {staff.general_detail?.assigned_zone || 'Campus Wide'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Active Tasks:</span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono text-[11px] font-semibold">
                            {staff.active_duties_count || 0} Duties
                          </span>
                        </div>
                      </>
                    )}

                    {staff.user_phone && (
                      <div className="flex items-center gap-1.5 text-zinc-400 pt-1">
                        <PhoneIcon className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-mono text-[11px]">{staff.user_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Bar */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {isTeaching ? (
                      <button
                        onClick={() => setAssignmentTeacher(staff)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold transition-colors"
                        title="Manage Assigned Classes"
                      >
                        <ClassIcon className="w-3.5 h-3.5" />
                        <span>Classes</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setDutyStaff(staff)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-colors"
                        title="Manage Operational Duties"
                      >
                        <DutyIcon className="w-3.5 h-3.5" />
                        <span>Duties</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/staff/${staff.id}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                    >
                      Profile
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(staff)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-sky-400 transition-colors"
                      title="Edit Profile"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingStaff(staff)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Delete Staff"
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
        /* HIGH DENSITY TABLE DISPLAY */
        <div className="overflow-x-auto rounded-2xl bg-zinc-900 border border-zinc-800">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Staff Type</th>
                <th className="py-3.5 px-4 font-semibold">Department</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Active Scope</th>
                <th className="py-3.5 px-4 font-semibold">Contact</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {staffList.map((staff) => {
                const isTeaching = staff.staff_type === 'TEACHING';
                return (
                  <tr key={staff.id} className="hover:bg-zinc-800/30 transition-colors">
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isTeaching ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {staff.user_name ? staff.user_name[0] : 'S'}
                        </div>
                        <div>
                          <div
                            onClick={() => navigate(`/staff/${staff.id}`)}
                            className="font-semibold text-zinc-100 hover:text-sky-400 cursor-pointer"
                          >
                            {staff.user_name || 'Staff Profile'}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {staff.employee_id} • {staff.designation}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Staff Type */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                        isTeaching ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {staff.staff_type}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 text-zinc-300">
                      {staff.department_name || 'General'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        staff.employment_status === 'PERMANENT'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {staff.employment_status}
                      </span>
                    </td>

                    {/* Active Scope */}
                    <td className="py-3 px-4">
                      {isTeaching ? (
                        <button
                          onClick={() => setAssignmentTeacher(staff)}
                          className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-mono text-[11px] font-semibold transition-colors"
                        >
                          {staff.active_assignments_count || 0} Classes
                        </button>
                      ) : (
                        <button
                          onClick={() => setDutyStaff(staff)}
                          className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono text-[11px] font-semibold transition-colors"
                        >
                          {staff.active_duties_count || 0} Duties
                        </button>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {staff.user_phone || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/staff/${staff.id}`)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-sky-400"
                          title="Edit"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingStaff(staff)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Modals */}
      {isFormOpen && (
        <StaffFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          staffData={editingStaff}
          onSaved={() => {
            showToast(editingStaff ? 'Staff profile updated!' : 'Staff profile created!', 'success');
            loadData(true);
          }}
        />
      )}

      {isInviteOpen && (
        <StaffInviteModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          onInvited={() => {
            showToast('Staff member invited successfully!', 'success');
            loadData(true);
          }}
        />
      )}

      {assignmentTeacher && (
        <TeacherAssignmentModal
          isOpen={Boolean(assignmentTeacher)}
          onClose={() => setAssignmentTeacher(null)}
          teacher={assignmentTeacher}
          onUpdated={() => loadData(true)}
        />
      )}

      {dutyStaff && (
        <GeneralDutyModal
          isOpen={Boolean(dutyStaff)}
          onClose={() => setDutyStaff(null)}
          staff={dutyStaff}
          onUpdated={() => loadData(true)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <TrashIcon className="w-6 h-6" />
              <h3 className="text-base font-bold text-zinc-100">Soft-Delete Staff Member?</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Are you sure you want to deactivate and soft-delete <span className="text-zinc-200 font-semibold">{deletingStaff.user_name || deletingStaff.employee_id}</span>?
              All active class assignments and duties will be deactivated immediately.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingStaff(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
