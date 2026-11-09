import { useState, useMemo } from 'react';
import type { StaffMember, StaffRankItem, DepartmentItem, StaffDisplayMode } from '../../types';

interface UseStaffFilterProps {
  staffList: StaffMember[];
  ranksList: StaffRankItem[];
  departments: DepartmentItem[];
}

export function useStaffFilter({ staffList, ranksList, departments }: UseStaffFilterProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [rankFilter, setRankFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [displayMode, setDisplayMode] = useState<StaffDisplayMode>(() => {
    try {
      return (localStorage.getItem('spr_staff_roster_display_mode') as StaffDisplayMode) || 'table';
    } catch {
      return 'table';
    }
  });

  const handleToggleDisplayMode = (mode: StaffDisplayMode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('spr_staff_roster_display_mode', mode);
    } catch {}
  };

  // Filter staff in memory for instantaneous search matching and hierarchy ranking
  const filteredStaff = useMemo(() => {
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
        if (roleFilter === 'TEACHER' || roleFilter === 'TEACHING') {
          matchesRole = s.staff_type === 'TEACHING';
        } else if (roleFilter === 'ADMIN' || roleFilter === 'SUPER_ADMIN') {
          matchesRole = s.staff_type === 'ADMIN';
        } else {
          matchesRole = s.staff_type === roleFilter;
        }
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

    // Sort by institutional hierarchy rank order (lowest rank order number first, e.g. Rank 1: Principal at top)
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

  const rankFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Ranks / Designations' },
      ...ranksList.map((r) => ({
        value: r.name,
        label: `[Rank ${r.order}] ${r.name_bn ? `${r.name_bn} (${r.name})` : r.name}`,
      })),
    ],
    [ranksList]
  );

  const departmentOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Departments' },
      ...departments.map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    ],
    [departments]
  );

  const statusOptions = [
    { value: 'ALL', label: 'All Employment Status' },
    { value: 'PERMANENT', label: 'Permanent Full-Time' },
    { value: 'PROBATION', label: 'Probationary' },
    { value: 'CONTRACT', label: 'Contractual' },
    { value: 'TERMINATED', label: 'Terminated / Released' },
  ];

  return {
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    rankFilter,
    setRankFilter,
    deptFilter,
    setDeptFilter,
    statusFilter,
    setStatusFilter,
    displayMode,
    handleToggleDisplayMode,
    filteredStaff,
    rankFilterOptions,
    departmentOptions,
    statusOptions,
  };
}

