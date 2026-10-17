import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { RoleRecord, RoleFilters, RoleMetrics } from '../types';

const STORAGE_KEY_ROLES = 'spr_local_roles_v1';
const STORAGE_KEY_VIEW_MODE = 'spr_role_management_view_mode';

const DEFAULT_SYSTEM_ROLES: RoleRecord[] = [
  {
    id: 1,
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    hierarchy_level: 1,
    description: 'Full system access & section control',
    is_system_role: true,
    action_permissions: {
      can_create_student: true,
      can_edit_student: true,
      can_delete_report: true,
      can_export_reports: true,
      can_manage_users: true,
    },
  },
  {
    id: 2,
    name: 'Administrator',
    code: 'ADMIN',
    hierarchy_level: 2,
    description: 'Institute admin with user & report controls',
    is_system_role: false,
    action_permissions: {
      can_create_student: true,
      can_edit_student: true,
      can_delete_report: true,
      can_export_reports: true,
      can_manage_users: true,
    },
  },
  {
    id: 3,
    name: 'Hifz Teacher / Ustadh',
    code: 'TEACHER',
    hierarchy_level: 5,
    description: 'Evaluates daily Sabaq, Sabqi & Amukhta',
    is_system_role: false,
    action_permissions: {
      can_create_student: true,
      can_edit_student: true,
      can_delete_report: false,
      can_export_reports: true,
      can_manage_users: false,
    },
  },
  {
    id: 4,
    name: 'Guardian / Parent',
    code: 'GUARDIAN',
    hierarchy_level: 10,
    description: 'View student progress reports & copy cards',
    is_system_role: false,
    action_permissions: {
      can_create_student: false,
      can_edit_student: false,
      can_delete_report: false,
      can_export_reports: true,
      can_manage_users: false,
    },
  },
];

export const useRoleManagement = () => {
  const [roles, setRoles] = useState<RoleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize: Only SUPER_ADMIN is protected (system role); all others are configurable
          return parsed.map((r: RoleRecord) => ({
            ...r,
            is_system_role: r.code === 'SUPER_ADMIN',
          }));
        }
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_SYSTEM_ROLES;
  });

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
      if (saved === 'grid' || saved === 'table') return saved;
    } catch {
      // Ignore
    }
    return 'table';
  });

  const [filters, setFilters] = useState<RoleFilters>({
    searchQuery: '',
    typeFilter: 'ALL',
    hierarchyFilter: 'ALL',
  });

  // Candidate API fetcher for resilience
  const loadRoles = useCallback(async () => {
    setLoading(true);
    const candidatePaths = ['/api/v1/roles/', '/api/roles/', '/roles/'];
    let fetched = false;

    for (const path of candidatePaths) {
      try {
        const res = await fetchWithAuth(path);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized = data.map((r: RoleRecord) => ({
              ...r,
              is_system_role: r.code === 'SUPER_ADMIN',
            }));
            setRoles(normalized);
            try {
              localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(normalized));
            } catch {
              // Ignore
            }
            fetched = true;
            break;
          }
        }
      } catch {
        // Try next candidate path
      }
    }

    if (!fetched) {
      // Keep existing cached or default roles
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleToggleViewMode = useCallback((mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
    } catch {
      // Ignore
    }
  }, []);

  const updateFilters = useCallback((updates: Partial<RoleFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      typeFilter: 'ALL',
      hierarchyFilter: 'ALL',
    });
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.searchQuery.trim() ||
          filters.typeFilter !== 'ALL' ||
          filters.hierarchyFilter !== 'ALL'
      ),
    [filters]
  );

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      // Search matching
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchesName = (role.name || '').toLowerCase().includes(query);
        const matchesCode = (role.code || '').toLowerCase().includes(query);
        const matchesDesc = (role.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }

      // Type filter (System vs Custom)
      if (filters.typeFilter === 'SYSTEM') {
        const isSystem = Boolean(role.code === 'SUPER_ADMIN');
        if (!isSystem) return false;
      } else if (filters.typeFilter === 'CUSTOM') {
        const isSystem = Boolean(role.code === 'SUPER_ADMIN');
        if (isSystem) return false;
      }

      // Hierarchy rank filter
      if (filters.hierarchyFilter !== 'ALL') {
        if (String(role.hierarchy_level) !== String(filters.hierarchyFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [roles, filters]);

  // Aggregate Metrics
  const metrics: RoleMetrics = useMemo(() => {
    let totalUsers = 0;
    let systemCount = 0;
    let customCount = 0;

    roles.forEach((r) => {
      totalUsers += r.user_count || 0;
      if (r.code === 'SUPER_ADMIN') {
        systemCount += 1;
      } else {
        customCount += 1;
      }
    });

    return {
      totalRoles: roles.length,
      systemRoles: systemCount,
      customRoles: customCount,
      totalUsersAssigned: totalUsers,
    };
  }, [roles]);

  return {
    roles,
    loading,
    viewMode,
    filters,
    filteredRoles,
    metrics,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    handleToggleViewMode,
    loadRoles,
  };
};

export default useRoleManagement;
