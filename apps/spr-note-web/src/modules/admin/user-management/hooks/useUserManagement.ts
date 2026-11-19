import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { UserRecord, UserRole, UserFilterState, UserMetrics } from '../types';

export function useUserManagement() {
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    try {
      return (localStorage.getItem('spr_user_view_mode') as 'table' | 'grid') || 'table';
    } catch {
      return 'table';
    }
  });

  const [users, setUsers] = useState<UserRecord[]>(() => {
    try {
      const saved = localStorage.getItem('spr_local_users_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [roles, setRoles] = useState<UserRole[]>(() => {
    try {
      const saved = localStorage.getItem('spr_local_roles_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => users.length === 0);
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

  const [filters, setFilters] = useState<UserFilterState>({
    role: 'ALL',
    status: 'ALL',
    provider: 'ALL',
    search: '',
  });

  const handleToggleViewMode = useCallback((mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_user_view_mode', mode);
    } catch {}
  }, []);

  const loadUsersAndRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, uRes] = await Promise.all([
        fetchWithAuth('/api/v1/roles/').catch(() => null),
        fetchWithAuth('/api/v1/users/').catch(() => null),
      ]);

      if (rRes && rRes.ok) {
        const rData = await rRes.json();
        const rList: UserRole[] = Array.isArray(rData) ? rData : [];
        setRoles(rList);
        localStorage.setItem('spr_local_roles_v1', JSON.stringify(rList));
      }

      if (uRes && uRes.ok) {
        const data = await uRes.json();
        const fetchedUsers: UserRecord[] = Array.isArray(data) ? data : data.results || [];
        setUsers(fetchedUsers);
        localStorage.setItem('spr_local_users_v1', JSON.stringify(fetchedUsers));
      } else {
        // Fallback endpoint
        try {
          const fb = await fetchWithAuth('/users/');
          if (fb.ok) {
            const data = await fb.json();
            const fetchedUsers: UserRecord[] = Array.isArray(data) ? data : data.results || [];
            setUsers(fetchedUsers);
            localStorage.setItem('spr_local_users_v1', JSON.stringify(fetchedUsers));
          }
        } catch {}
      }
    } catch {
      showToast('Error loading user management data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsersAndRoles();
  }, [loadUsersAndRoles]);

  // Multi-Selection Handlers
  const handleSelectRow = useCallback((id: number | string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback((selectedList: (number | string)[] | boolean) => {
    if (Array.isArray(selectedList)) {
      setSelectedIds(selectedList);
    } else {
      setSelectedIds([]);
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Filtered & Searched Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Role Filter
      const uRoleCode = (u.role?.code || u.role_info?.code || u.user_type || '').toUpperCase();
      const roleMatch = filters.role === 'ALL' || uRoleCode === filters.role.toUpperCase();

      // 2. Status Filter
      let statusMatch = true;
      if (filters.status === 'ACTIVE') {
        statusMatch = u.is_active !== false && !u.is_deactivated;
      } else if (filters.status === 'INACTIVE') {
        statusMatch = u.is_active === false || Boolean(u.is_deactivated);
      }

      // 3. Auth Provider Filter
      let providerMatch = true;
      if (filters.provider === 'GOOGLE') {
        providerMatch = u.auth_provider === 'google';
      } else if (filters.provider === 'EMAIL') {
        providerMatch = u.auth_provider !== 'google';
      }

      // 4. Search Filter
      const search = filters.search.toLowerCase().trim();
      const nameMatch =
        !search ||
        (u.name || '').toLowerCase().includes(search) ||
        (u.first_name || '').toLowerCase().includes(search) ||
        (u.last_name || '').toLowerCase().includes(search) ||
        (u.phone_number || '').includes(search) ||
        (u.email || '').toLowerCase().includes(search);

      return roleMatch && statusMatch && providerMatch && nameMatch;
    });
  }, [users, filters]);

  // Metrics Calculations
  const metrics = useMemo<UserMetrics>(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.is_active !== false && !u.is_deactivated).length;
    const inactiveUsers = totalUsers - activeUsers;
    const googleUsers = users.filter((u) => u.auth_provider === 'google').length;
    const systemRoles = roles.length || 5;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      googleUsers,
      systemRoles,
    };
  }, [users, roles]);

  const updateFilters = useCallback((partial: Partial<UserFilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      role: 'ALL',
      status: 'ALL',
      provider: 'ALL',
      search: '',
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.role !== 'ALL' || filters.status !== 'ALL' || filters.provider !== 'ALL' || Boolean(filters.search.trim());
  }, [filters]);

  return {
    users,
    roles,
    loading,
    viewMode,
    filters,
    selectedIds,
    filteredUsers,
    metrics,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    handleToggleViewMode,
    handleSelectRow,
    handleSelectAll,
    handleClearSelection,
    loadUsersAndRoles,
    setUsers,
  };
}
