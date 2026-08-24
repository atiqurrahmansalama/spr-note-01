import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { fetchWithAuth } from '../../utils/authService';
import { getStaffList, getStaffMetrics, deleteStaff } from '../../api/staff';
import { staffRanksStore } from '../../utils/localStore';

import {
  TeacherIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  WhatsAppIcon,
  PhoneIcon,
  ClassIcon,
  DutyIcon,
  BuildingOfficeIcon,
  RefreshIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import DataTable from '../../components/ui/DataTable';
import DataCardGrid from '../../components/ui/DataCardGrid';
import ActionMenu from '../../components/ui/ActionMenu';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import { RoleSelect } from '../../components/selectors';
import MetricsGrid from '../../components/ui/MetricsGrid';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';

import StaffDrawerForm from './StaffDrawerForm';
import TeacherAssignmentDrawerForm from './TeacherAssignmentDrawerForm';
import GeneralDutyDrawerForm from './GeneralDutyDrawerForm';

export default function TeacherStaffRosterView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [ranksList, setRanksList] = useState(() => staffRanksStore.getRanks(activeTenantId));
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [metrics, setMetrics] = useState({
    total_staff: 0,
    teaching_staff: 0,
    active_staff: 0,
    on_leave_today: 0,
  });

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [rankFilter, setRankFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem('spr_staff_roster_display_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const handleToggleDisplayMode = (mode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('spr_staff_roster_display_mode', mode);
    } catch {}
  };

  // Load Departments
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
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const params = {
        search: searchQuery.trim(),
        department: deptFilter !== 'ALL' ? deptFilter : undefined,
        employment_status: statusFilter !== 'ALL' ? statusFilter : undefined,
      };

      if (roleFilter === 'TEACHING') {
        params.staff_type = 'TEACHING';
      } else if (roleFilter === 'SUPPORT') {
        params.staff_type = 'SUPPORT';
      } else if (roleFilter === 'ADMIN') {
        params.staff_type = 'ADMIN';
      } else if (roleFilter === 'MANAGEMENT') {
        params.staff_type = 'MANAGEMENT';
      }

      const [listRes, metricsRes] = await Promise.all([
        getStaffList(params),
        getStaffMetrics(),
      ]);

      const items = Array.isArray(listRes) ? listRes : listRes.results || [];
      setStaffList(items);
      if (metricsRes) {
        setMetrics({
          total_staff: metricsRes.total_staff || 0,
          teaching_staff: metricsRes.teaching_staff || 0,
          active_staff: metricsRes.active_staff || 0,
          on_leave_today: metricsRes.on_leave_today || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load staff roster:', err);
      showToast(err.message || 'Failed to load teacher & staff roster', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, roleFilter, deptFilter, statusFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTenantId]);

  // Listen for tenant switch
  useEffect(() => {
    const handleTenantChanged = () => {
      setRoleFilter('ALL');
      setDeptFilter('ALL');
      setStatusFilter('ALL');
      loadData();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    return () => window.removeEventListener('spr_tenant_changed', handleTenantChanged);
  }, [loadData]);

  // Open Staff Drawer (Add / Edit)
  const handleOpenStaffDrawer = (staff = null) => {
    openRightSidebar({
      title: staff ? 'Edit Staff Profile' : 'Onboard Teacher / Staff',
      subtitle: staff
        ? `Updating profile details for ${staff.user_name || staff.employee_id}`
        : 'Register a new faculty or administrative staff member',
      width: 'lg',
      content: (
        <StaffDrawerForm
          staffData={staff}
          onSaved={() => {
            closeRightSidebar();
            loadData(true);
          }}
          onCancel={() => closeRightSidebar()}
        />
      ),
    });
  };

  // Open Teacher Assignment Drawer
  const handleOpenTeacherAssignments = (staff) => {
    openRightSidebar({
      title: 'Class & Subject Assignments',
      subtitle: `Manage assigned academic classes and groups for ${staff.user_name || staff.employee_id}`,
      width: 'md',
      content: (
        <TeacherAssignmentDrawerForm
          teacher={staff}
          onUpdated={() => {
            loadData(true);
          }}
          onCancel={() => closeRightSidebar()}
        />
      ),
    });
  };

  // Open General Duty Drawer
  const handleOpenGeneralDuties = (staff) => {
    openRightSidebar({
      title: 'General & Campus Duties',
      subtitle: `Assign residential, dining, or gate duties for ${staff.user_name || staff.employee_id}`,
      width: 'md',
      content: (
        <GeneralDutyDrawerForm
          staff={staff}
          onUpdated={() => {
            loadData(true);
          }}
          onCancel={() => closeRightSidebar()}
        />
      ),
    });
  };

  // Delete Single Staff
  const handleDeleteStaff = async (staff) => {
    const staffName = staff.user_name || staff.name_en || staff.employee_id;
    if (
      !window.confirm(
        `Are you sure you want to delete staff member "${staffName}"? All active duties and assignments will be deactivated.`
      )
    ) {
      return;
    }

    try {
      await deleteStaff(staff.id);
      showToast(`Staff member "${staffName}" has been soft-deleted.`, 'success');
      loadData(true);
    } catch (err) {
      showToast(err.message || 'Failed to delete staff member', 'error');
    }
  };

  // Listen for live rank updates from Developer Tools
  useEffect(() => {
    const handleRanksUpdated = () => {
      setRanksList(staffRanksStore.getRanks(activeTenantId));
    };
    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    return () => window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
  }, [activeTenantId]);

  // Filter staff in memory for instantaneous search matching and hierarchy ranking
  const filteredStaff = React.useMemo(() => {
    const result = staffList.filter((s) => {
      const name = (s.user_name || s.name_en || '').toLowerCase();
      const bName = (s.bangla_name || '').toLowerCase();
      const empId = String(s.employee_id || '').toLowerCase();
      const designation = (s.designation || '').toLowerCase();
      const phone = (s.phone_number || s.emergency_contact || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        bName.includes(query) ||
        empId.includes(query) ||
        designation.includes(query) ||
        phone.includes(query);

      let matchesRole = true;
      if (roleFilter !== 'ALL') {
        matchesRole = s.staff_type === roleFilter;
      }

      let matchesRank = true;
      if (rankFilter !== 'ALL') {
        matchesRank = s.designation === rankFilter;
      }

      let matchesDept = true;
      if (deptFilter !== 'ALL') {
        matchesDept = String(s.department) === String(deptFilter);
      }

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = s.employment_status === statusFilter;
      }

      return matchesSearch && matchesRole && matchesRank && matchesDept && matchesStatus;
    });

    // Sort by institutional hierarchy rank order (lowest number first, e.g. Rank 1: Principal/Muhtamim at top)
    result.sort((a, b) => {
      const matchedRankA = ranksList.find((r) => r.name === a.designation);
      const matchedRankB = ranksList.find((r) => r.name === b.designation);
      const rankA =
        a.rank_order !== undefined && a.rank_order !== null && a.rank_order !== 99
          ? Number(a.rank_order)
          : matchedRankA
          ? Number(matchedRankA.order)
          : 99;
      const rankB =
        b.rank_order !== undefined && b.rank_order !== null && b.rank_order !== 99
          ? Number(b.rank_order)
          : matchedRankB
          ? Number(matchedRankB.order)
          : 99;

      if (rankA !== rankB) return rankA - rankB;
      return String(a.employee_id || '').localeCompare(String(b.employee_id || ''));
    });

    return result;
  }, [staffList, searchQuery, roleFilter, rankFilter, deptFilter, statusFilter, ranksList]);

  const rankFilterOptions = React.useMemo(() => [
    { value: 'ALL', label: 'All Ranks / Designations' },
    ...ranksList.map((r) => ({
      value: r.name,
      label: `[Rank ${r.order}] ${r.name_bn ? `${r.name_bn} (${r.name})` : r.name}`,
    })),
  ], [ranksList]);

  // Action Menu Items for Each Staff Row
  const getActionMenuItems = (s) => [
    {
      label: 'View Profile',
      icon: SearchIcon,
      onClick: () => navigate(`/staff/${s.id}`),
    },
    {
      label: 'Edit Profile',
      icon: EditIcon,
      onClick: () => handleOpenStaffDrawer(s),
    },
    ...(s.staff_type === 'TEACHING'
      ? [
          {
            label: 'Assign Classes',
            icon: ClassIcon,
            onClick: () => handleOpenTeacherAssignments(s),
          },
        ]
      : []),
    {
      label: 'Assign Duties',
      icon: DutyIcon,
      onClick: () => handleOpenGeneralDuties(s),
    },
    ...(s.phone_number || s.emergency_contact
      ? [
          {
            label: 'WhatsApp Message',
            icon: WhatsAppIcon,
            onClick: () => {
              const num = (s.phone_number || s.emergency_contact).replace(/[^\d]/g, '');
              window.open(`https://wa.me/${num}`, '_blank');
            },
          },
        ]
      : []),
    { divider: true },
    {
      label: 'Delete Record',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeleteStaff(s),
    },
  ];

  // Table Columns Specification (Zero Hardcoded Logic & Project Design Tokens)
  const tableColumns = [
    {
      key: 'name',
      header: 'FACULTY & STAFF',
      headerClassName: 'text-left',
      align: 'left',
      render: (s) => {
        const staffName = s.user_name || s.name_en || s.name || s.employee_id;
        const initial = staffName ? staffName.charAt(0).toUpperCase() : 'S';

        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center border theme-border shrink-0 shadow-xs">
              {s.user_avatar ? (
                <img
                  src={s.user_avatar}
                  alt={staffName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <span
                onClick={() => navigate(`/staff/${s.id}`)}
                className="font-bold theme-text-primary text-xs sm:text-sm truncate block leading-tight hover:underline cursor-pointer"
              >
                {staffName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono theme-accent font-medium">
                  {s.employee_id || 'ID: —'}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'rank_designation',
      header: 'RANK & DESIGNATION',
      headerClassName: 'text-left',
      align: 'left',
      render: (s) => {
        const matchedRank = ranksList.find((r) => r.name === s.designation || r.name_bn === s.designation);
        const rankNum =
          s.rank_order !== undefined && s.rank_order !== 99 && s.rank_order !== null
            ? s.rank_order
            : matchedRank
            ? matchedRank.order
            : null;
        const title = s.designation || 'Staff';
        const banglaTitle = matchedRank?.name_bn || '';

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {rankNum ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border theme-border font-mono shadow-xs">
                  Rank {rankNum}
                </span>
              ) : null}
              <span className="text-xs font-bold theme-text-primary">
                {title}
              </span>
            </div>
            {banglaTitle && (
              <span className="text-[11px] theme-text-secondary block font-medium opacity-80">
                {banglaTitle}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'department_role',
      header: 'DEPARTMENT & ROLE',
      headerClassName: 'text-left',
      align: 'left',
      render: (s) => (
        <div className="space-y-1">
          <div className="text-xs font-semibold theme-text-primary truncate">
            {s.department_name || 'General Department'}
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              s.staff_type === 'TEACHING'
                ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                : 'theme-bg-sub theme-text-secondary theme-border'
            }`}
          >
            {s.staff_type_display || s.staff_type || 'Faculty'}
          </span>
        </div>
      ),
    },
    {
      key: 'assignments',
      header: 'ASSIGNMENTS',
      headerClassName: 'text-center',
      align: 'center',
      render: (s) => {
        const assignCount = s.assigned_classes_count || (s.assignments ? s.assignments.length : 0);
        const dutiesCount = s.assigned_duties_count || (s.duties ? s.duties.length : 0);

        return (
          <div className="flex flex-col items-center justify-center gap-1">
            {s.staff_type === 'TEACHING' ? (
              <button
                type="button"
                onClick={() => handleOpenTeacherAssignments(s)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg theme-bg-sub hover:theme-bg-accent-soft theme-text-primary text-[11px] font-medium border theme-border transition-colors cursor-pointer"
                title="Manage Class Assignments"
              >
                <ClassIcon className="w-3 h-3 theme-accent" />
                <span>{assignCount} Classes</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenGeneralDuties(s)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg theme-bg-sub hover:theme-bg-accent-soft theme-text-primary text-[11px] font-medium border theme-border transition-colors cursor-pointer"
                title="Manage Duties"
              >
                <DutyIcon className="w-3 h-3 theme-accent" />
                <span>{dutiesCount} Duties</span>
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'contact',
      header: 'CONTACT',
      headerClassName: 'text-center',
      align: 'center',
      render: (s) => {
        const phone = s.phone_number || s.emergency_contact;
        return (
          <div className="flex items-center justify-center gap-1.5">
            {phone ? (
              <>
                <a
                  href={`tel:${phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg border theme-border hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition-colors cursor-pointer"
                  title={`Call ${phone}`}
                >
                  <PhoneIcon className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg border theme-border hover:bg-emerald-500/10 hover:text-emerald-500 theme-text-secondary transition-colors cursor-pointer"
                  title="WhatsApp Chat"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <span className="text-[11px] theme-text-secondary opacity-50">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      headerClassName: 'text-center',
      align: 'center',
      render: (s) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            s.employment_status === 'PERMANENT'
              ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
              : s.employment_status === 'PROBATION'
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              : 'theme-bg-sub theme-text-secondary theme-border'
          }`}
        >
          {s.employment_status || 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      align: 'right',
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(s)} align="right" />
        </div>
      ),
    },
  ];

  const departmentOptions = [
    { value: 'ALL', label: 'All Departments' },
    ...departments.map((d) => ({
      value: String(d.id),
      label: d.name,
    })),
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Employment Status' },
    { value: 'PERMANENT', label: 'Permanent Full-Time' },
    { value: 'PROBATION', label: 'Probationary' },
    { value: 'CONTRACT', label: 'Contractual' },
    { value: 'TERMINATED', label: 'Terminated / Released' },
  ];

  return (
    <PageContainer>
      {/* 1. Page Header */}
      <PageHeader
        icon={TeacherIcon}
        title="Teacher & Staff Roster"
        subtitle="Manage faculty members, institutional hierarchy ranks, department assignments, and duties"
        breadcrumbs={[
          { label: 'Staff Management', href: '/staff' },
          { label: 'Teacher & Staff Roster', active: true },
        ]}
        actions={
          <button
            onClick={() => navigate('/staff/onboarding')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Onboard Staff</span>
          </button>
        }
      />

      {/* 2. Top Metrics Grid */}
      <MetricsGrid
        metrics={[
          {
            title: 'Total Faculty & Staff',
            value: metrics.total_staff,
            icon: TeacherIcon,
            change: `${filteredStaff.length} matching view`,
            changeType: 'neutral',
          },
          {
            title: 'Teaching Faculty',
            value: metrics.teaching_staff,
            icon: ClassIcon,
            change: 'Active teachers & ustads',
            changeType: 'positive',
          },
          {
            title: 'Active Personnel',
            value: metrics.active_staff,
            icon: SparklesIcon,
            change: 'Available on roster',
            changeType: 'positive',
          },
          {
            title: 'On Leave Today',
            value: metrics.on_leave_today,
            icon: DutyIcon,
            change: metrics.on_leave_today > 0 ? 'Substitutes required' : 'Full attendance',
            changeType: metrics.on_leave_today > 0 ? 'negative' : 'positive',
          },
        ]}
      />

      {/* 3. Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div>
            <CustomInput
              type="search"
              placeholder="Search by name, ID, phone..."
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
            />
          </div>

          {/* Role Filter */}
          <div>
            <RoleSelect
              value={roleFilter === 'ALL' ? '' : roleFilter}
              onChange={(val) => setRoleFilter(val || 'ALL')}
              valueKey="code"
              allowAll={true}
              allLabel="All Roles"
              placeholder="Filter by Role"
              label={null}
            />
          </div>

          {/* Rank / Designation Filter */}
          <div>
            <CustomSelect
              options={rankFilterOptions}
              value={rankFilter}
              onChange={(val) => setRankFilter(val)}
              placeholder="Filter by Rank"
              searchable={true}
            />
          </div>

          {/* Department Filter */}
          <div>
            <CustomSelect
              options={departmentOptions}
              value={deptFilter}
              onChange={(val) => setDeptFilter(val)}
              placeholder="Filter by Department"
            />
          </div>

          {/* Employment Status Filter */}
          <div>
            <CustomSelect
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              placeholder="Filter by Status"
            />
          </div>
        </div>

        {/* Bottom Toolbar & View Switcher */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t theme-border">
          <div className="text-xs theme-text-secondary font-medium">
            Showing <span className="font-bold theme-text-primary">{filteredStaff.length}</span> of{' '}
            <span className="font-bold theme-text-primary">{staffList.length}</span> personnel
          </div>

          {/* View Mode Toggle Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl theme-bg-sub border theme-border">
            <button
              onClick={() => handleToggleDisplayMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                displayMode === 'table'
                  ? 'theme-bg-surface theme-accent shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => handleToggleDisplayMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                displayMode === 'grid'
                  ? 'theme-bg-surface theme-accent shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Card Grid
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Roster Content (Table vs Card Grid) */}
      {displayMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={filteredStaff}
          loading={loading}
          emptyMessage="No teacher or staff records match your selected filters."
          onRowClick={(s) => navigate(`/staff/${s.id}`)}
        />
      ) : (
        <DataCardGrid
          items={filteredStaff}
          loading={loading}
          emptyMessage="No teacher or staff records match your selected filters."
          renderCard={(s) => {
            const staffName = s.user_name || s.name_en || s.name || s.employee_id;
            const initial = staffName ? staffName.charAt(0).toUpperCase() : 'S';
            const phone = s.phone_number || s.emergency_contact;
            const assignCount = s.assigned_classes_count || (s.assignments ? s.assignments.length : 0);
            const matchedRank = ranksList.find((r) => r.name === s.designation || r.name_bn === s.designation);
            const rankNum =
              s.rank_order !== undefined && s.rank_order !== 99 && s.rank_order !== null
                ? s.rank_order
                : matchedRank
                ? matchedRank.order
                : null;

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/staff/${s.id}`)}
                className="p-4 rounded-2xl theme-bg-surface border theme-border hover:border-[var(--accent-main)]/50 transition-all cursor-pointer shadow-xs hover:shadow-md space-y-3.5"
              >
                {/* Header: Avatar, Name, Action Menu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center border theme-border shrink-0">
                      {s.user_avatar ? (
                        <img
                          src={s.user_avatar}
                          alt={staffName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm theme-text-primary truncate">
                        {staffName}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {rankNum ? (
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded theme-bg-accent-soft theme-accent border theme-border">
                            Rank {rankNum}
                          </span>
                        ) : null}
                        <p className="text-[11px] theme-text-secondary truncate font-medium">
                          {s.designation || 'Staff'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <ActionMenu items={getActionMenuItems(s)} align="right" />
                  </div>
                </div>

                {/* Badges: Department & ID */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full theme-bg-sub theme-accent border theme-border font-bold">
                    {s.employee_id || 'ID: —'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent font-medium border border-[var(--accent-main)]/20">
                    {s.department_name || 'General Dept'}
                  </span>
                </div>

                {/* Footer: Assignments & Quick Contact */}
                <div className="pt-2.5 border-t theme-border flex items-center justify-between gap-2">
                  <div className="text-[11px] theme-text-secondary">
                    {s.staff_type === 'TEACHING'
                      ? `${assignCount} Classes Assigned`
                      : `${s.assigned_duties_count || 0} Duties Assigned`}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {phone && (
                      <>
                        <a
                          href={`tel:${phone}`}
                          className="p-1.5 rounded-lg border theme-border hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition-colors"
                          title="Call"
                        >
                          <PhoneIcon className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border theme-border hover:bg-emerald-500/10 hover:text-emerald-500 theme-text-secondary transition-colors"
                          title="WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}
    </PageContainer>
  );
}
