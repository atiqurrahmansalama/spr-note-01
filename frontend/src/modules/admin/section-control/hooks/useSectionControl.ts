import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useFeatureControl } from '../../../../context/FeatureControlContext';
import { useSectionTranslation } from './useSectionTranslation';
import {
  ScopeType,
  SectionCategory,
  SectionItem,
  AuditLogEntry,
  RoleOption,
  UserSearchResult,
  BatchUpdatePayload,
  AcademyOption,
} from '../types';

const VALID_SCOPES: ScopeType[] = ['global', 'role', 'academy', 'user', 'audit'];

export function useSectionControl() {
  const { showToast } = useToast();
  const { refetchConfig } = useFeatureControl();
  const { t } = useSectionTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Unified URL-Derived State as Single Source of Truth (Prevents multi-render ping-pong)
  const activeScope = useMemo<ScopeType>(() => {
    const tabParam = searchParams.get('tab') as ScopeType | null;
    return tabParam && VALID_SCOPES.includes(tabParam) ? tabParam : 'global';
  }, [searchParams]);

  const [dbRoles, setDbRoles] = useState<RoleOption[]>(() => {
    try {
      const saved = localStorage.getItem('spr_local_roles_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const selectedRole = useMemo(() => {
    const roleParam = searchParams.get('role');
    if (roleParam) return roleParam;
    if (dbRoles.length > 0) return dbRoles[0].code;
    return '';
  }, [searchParams, dbRoles]);

  const [dbAcademies, setDbAcademies] = useState<AcademyOption[]>(() => {
    try {
      const saved = localStorage.getItem('spr_local_academies_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const selectedAcademy = useMemo(() => {
    const academyParam = searchParams.get('academy');
    if (academyParam) return academyParam;
    if (dbAcademies.length > 0) return String(dbAcademies[0].id);
    return '';
  }, [searchParams, dbAcademies]);

  const selectedUser = useMemo(() => {
    return searchParams.get('user') || '';
  }, [searchParams]);

  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);

  // Control Rules Data State
  const [categories, setCategories] = useState<SectionCategory[]>(() => {
    try {
      const saved = localStorage.getItem('spr_section_control_tree_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [modifiedFlags, setModifiedFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const [dbUsers, setDbUsers] = useState<UserSearchResult[]>(() => {
    try {
      const saved = localStorage.getItem('spr_local_users_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // URL-synchronized atomic setters
  const setActiveScope = useCallback(
    (scope: ScopeType) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', scope);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSelectedRole = useCallback(
    (role: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (role) {
            next.set('role', role);
          } else {
            next.delete('role');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );


  const setSelectedAcademy = useCallback(
    (academyId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (academyId) {
            next.set('academy', academyId);
          } else {
            next.delete('academy');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSelectedUser = useCallback(
    (userId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (userId) {
            next.set('user', userId);
          } else {
            next.delete('user');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Ensure initial URL contains explicit ?tab= param for shareable tab links
  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'global');
          return next;
        },
        { replace: true }
      );
    }
  }, []);

  // 1. Fetch available Roles & Users for Scope Selectors
  useEffect(() => {
    let isMounted = true;

    const fetchRoles = async () => {
      const paths = ['/api/v1/roles/', '/api/roles/', '/roles/'];
      for (const path of paths) {
        try {
          const res = await fetchWithAuth(path);
          if (res.ok && isMounted) {
            const data = await res.json();
            const list: RoleOption[] = Array.isArray(data) ? data : data.results || [];
            if (list.length > 0) {
              setDbRoles(list);
              try {
                localStorage.setItem('spr_local_roles_v1', JSON.stringify(list));
              } catch {}
              return;
            }
          }
        } catch {}
      }
    };

    const fetchUsers = async () => {
      try {
        let res = await fetchWithAuth('/api/v1/users/');
        if (!res.ok) {
          res = await fetchWithAuth('/api/users/');
        }
        if (!res.ok) {
          res = await fetchWithAuth('/users/');
        }
        if (res.ok && isMounted) {
          const data = await res.json();
          const list: UserSearchResult[] = Array.isArray(data) ? data : data.results || [];
          setDbUsers(list);
          try {
            localStorage.setItem('spr_local_users_v1', JSON.stringify(list));
          } catch {}
        }
      } catch {
        if (isMounted) setDbUsers([]);
      }
    };

    const fetchAcademies = async () => {
      const paths = ['/api/v1/institutions/', '/api/institutions/', '/institutions/'];
      for (const path of paths) {
        try {
          const res = await fetchWithAuth(path);
          if (res.ok && isMounted) {
            const data = await res.json();
            const list: AcademyOption[] = (Array.isArray(data) ? data : data.results || []).map((inst: any) => ({
              id: inst.id,
              name: inst.name || inst.institution_name || `Academy #${inst.id}`,
              code: inst.code,
              short_name: inst.short_name,
            }));
            if (list.length > 0) {
              setDbAcademies(list);
              try {
                localStorage.setItem('spr_local_academies_v1', JSON.stringify(list));
              } catch {}
              return;
            }
          }
        } catch {}
      }
    };

    fetchRoles();
    fetchAcademies();
    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Target Identifier Computation based on Scope
  const currentTargetId = useMemo(() => {
    if (activeScope === 'role') return selectedRole;
    if (activeScope === 'academy') return selectedAcademy;
    if (activeScope === 'user') return selectedUser;
    return '';
  }, [activeScope, selectedRole, selectedAcademy, selectedUser]);

  // 3. Fetch Rules for selected scope and target
  const loadRules = useCallback(async () => {
    if (activeScope === 'audit') return;
    setLoading(true);
    setModifiedFlags({});
    try {
      let url = `/api/v1/admin/section-control/tree/?scope=${activeScope}&_t=${Date.now()}`;
      if (currentTargetId) {
        url += `&target_id=${encodeURIComponent(currentTargetId)}`;
      }

      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        const resCats: SectionCategory[] = Array.isArray(data) ? data : data.categories || [];
        setCategories(resCats);
        if (resCats.length > 0) {
          try {
            localStorage.setItem('spr_section_control_tree_cache', JSON.stringify(resCats));
            localStorage.setItem(
              `spr_section_control_tree_${activeScope}_${currentTargetId || 'default'}`,
              JSON.stringify(resCats)
            );
          } catch {}
        }
      } else {
        try {
          const scopedCache = localStorage.getItem(
            `spr_section_control_tree_${activeScope}_${currentTargetId || 'default'}`
          );
          const fallbackCache = scopedCache || localStorage.getItem('spr_section_control_tree_cache');
          if (fallbackCache) {
            setCategories(JSON.parse(fallbackCache));
          } else {
            setCategories([]);
          }
        } catch {
          setCategories([]);
        }
      }
    } catch {
      try {
        const scopedCache = localStorage.getItem(
          `spr_section_control_tree_${activeScope}_${currentTargetId || 'default'}`
        );
        const fallbackCache = scopedCache || localStorage.getItem('spr_section_control_tree_cache');
        if (fallbackCache) {
          setCategories(JSON.parse(fallbackCache));
        } else {
          setCategories([]);
        }
      } catch {
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeScope, currentTargetId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // 4. Fetch Audit Logs when Audit tab is active with optional scope/search filtering
  const loadAuditLogs = useCallback(
    async (filterScope?: string, search?: string) => {
      if (activeScope !== 'audit') return;
      setLoadingLogs(true);
      try {
        let url = `/api/v1/control-panel/audit-logs/?_t=${Date.now()}`;
        if (filterScope && filterScope !== 'ALL') {
          url += `&scope=${encodeURIComponent(filterScope)}`;
        }
        if (search && search.trim()) {
          url += `&search=${encodeURIComponent(search.trim())}`;
        }
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(Array.isArray(data) ? data : data.logs || []);
        }
      } catch {
        showToast(t('toasts.loadAuditError', 'Failed to load audit logs'), 'error');
      } finally {
        setLoadingLogs(false);
      }
    },
    [activeScope, showToast, t]
  );

  useEffect(() => {
    if (activeScope === 'audit') {
      loadAuditLogs();
    }
  }, [activeScope, loadAuditLogs]);

  // 5. User Search Auto-complete for User Scope
  useEffect(() => {
    if (activeScope !== 'user' || !userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(
          `/api/users/?search=${encodeURIComponent(userSearchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          const list: UserSearchResult[] = Array.isArray(data) ? data : data.results || [];
          setUserSearchResults(list.slice(0, 5));
        }
      } catch {
        setUserSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeScope, userSearchQuery]);

  // Baseline map of pristine database values loaded from backend
  const baselineStateMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    const traverse = (items: SectionItem[] = []) => {
      for (const item of items) {
        if (item && item.section_key) {
          map[item.section_key] = Boolean(item.effective_enabled);
        }
        if (item && item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    for (const cat of categories) {
      if (cat && cat.sections) {
        traverse(cat.sections);
      }
    }
    return map;
  }, [categories]);

  // Handle Toggle Switch Change with automatic baseline revert detection
  const handleToggle = useCallback(
    (sectionKey: string, currentEffectiveVal: boolean) => {
      setModifiedFlags((prev) => {
        const nextVal = !currentEffectiveVal;
        const baselineVal = baselineStateMap[sectionKey];

        // If toggling returns the switch to its pristine database state, remove from modifiedFlags
        if (baselineVal !== undefined && nextVal === baselineVal) {
          const next = { ...prev };
          delete next[sectionKey];
          return next;
        }

        return {
          ...prev,
          [sectionKey]: nextVal,
        };
      });
    },
    [baselineStateMap]
  );

  // Broadcast Helper to notify all browser windows/tabs
  const broadcastUpdate = useCallback((detailLocal?: any) => {
    try {
      if (typeof window !== 'undefined') {
        if (detailLocal) {
          window.dispatchEvent(
            new CustomEvent('spr_section_config_updated', { detail: detailLocal })
          );
        } else {
          window.dispatchEvent(new CustomEvent('spr_section_config_updated'));
        }
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('spr_section_control_channel');
          bc.postMessage({ type: 'SECTION_CONTROL_UPDATED', timestamp: Date.now() });
          bc.close();
        }
      }
    } catch {}
  }, []);

  // Save Batch Updates
  const handleSaveBatch = useCallback(async () => {
    const keys = Object.keys(modifiedFlags);
    if (keys.length === 0) {
      showToast(t('toasts.noChanges', 'No flag changes to save.'), 'info');
      return;
    }

    setSaving(true);
    try {
      const payload: BatchUpdatePayload = {
        scope_type: activeScope.toUpperCase(),
        scope: activeScope,
        target_identifier: currentTargetId,
        target_id: currentTargetId,
        updates: keys.map((k) => ({
          section_key: k,
          is_enabled: modifiedFlags[k],
        })),
      };

      let res = await fetchWithAuth('/api/v1/admin/section-control/update/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/control-panel/rules/batch-update/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || t('toasts.saveSuccess', 'Section rules saved successfully!'), 'success');

        broadcastUpdate();

        setModifiedFlags({});
        refetchConfig();
        loadRules();
      } else {
        showToast(t('toasts.saveError', 'Failed to save section rule updates.'), 'error');
      }
    } catch {
      showToast(t('toasts.serverError', 'Error updating rules on server.'), 'error');
    } finally {
      setSaving(false);
    }
  }, [modifiedFlags, activeScope, currentTargetId, showToast, t, broadcastUpdate, refetchConfig, loadRules]);

  // Reset Overrides back to defaults
  const handleResetOverrides = useCallback(async () => {
    if (activeScope === 'global') {
      showToast(
        t('toasts.globalResetBlocked', 'Global defaults cannot be reset. Modify individual flags instead.'),
        'warning'
      );
      return;
    }

    const confirmMsg = t(
      'toasts.resetConfirm',
      `Reset all ${activeScope.toUpperCase()} overrides for "${currentTargetId}" back to defaults?`,
      { scope: activeScope.toUpperCase(), target: currentTargetId }
    );
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetchWithAuth('/api/v1/control-panel/rules/reset/', {
        method: 'POST',
        body: JSON.stringify({ scope: activeScope, target_id: currentTargetId }),
      });

      if (res.ok) {
        showToast(
          t('toasts.resetSuccess', `Reset ${activeScope.toUpperCase()} overrides back to default`, {
            scope: activeScope.toUpperCase(),
          }),
          'success'
        );
        setModifiedFlags({});
        broadcastUpdate();
        refetchConfig();
        loadRules();
      } else {
        showToast(t('toasts.resetError', 'Failed to reset section overrides'), 'error');
      }
    } catch {
      showToast(t('toasts.serverError', 'Error resetting overrides on server'), 'error');
    } finally {
      setResetting(false);
    }
  }, [activeScope, currentTargetId, showToast, t, broadcastUpdate, refetchConfig, loadRules]);

  // Force-apply Global Default to ALL accounts by clearing conflicting Role & User overrides
  const handleClearOverridesGlobally = useCallback(async () => {
    const targetKeys = Object.keys(modifiedFlags);
    if (targetKeys.length === 0) {
      showToast(
        t('toasts.forceApplyPrompt', 'Toggle sections first, then click this to force-apply globally.'),
        'info'
      );
      return;
    }

    setSaving(true);
    try {
      // 1. Save global batch updates first
      const payload: BatchUpdatePayload = {
        scope_type: 'GLOBAL',
        scope: 'global',
        target_identifier: '',
        target_id: '',
        updates: targetKeys.map((k) => ({
          section_key: k,
          is_enabled: modifiedFlags[k],
        })),
      };

      await fetchWithAuth('/api/v1/admin/section-control/update/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // 2. Clear conflicting overrides for these specific section keys
      const clearRes = await fetchWithAuth('/api/v1/admin/section-control/clear-overrides/', {
        method: 'POST',
        body: JSON.stringify({ section_keys: targetKeys }),
      });

      if (clearRes.ok) {
        showToast(
          t('toasts.saveSuccess', 'Applied globally! All conflicting overrides cleared.'),
          'success'
        );
        broadcastUpdate();

        setModifiedFlags({});
        refetchConfig();
        loadRules();
      } else {
        showToast(t('toasts.saveError', 'Updated global, but failed to clear subordinate overrides.'), 'warning');
      }
    } catch {
      showToast(t('toasts.serverError', 'Network error during force apply operation.'), 'error');
    } finally {
      setSaving(false);
    }
  }, [modifiedFlags, showToast, t, broadcastUpdate, refetchConfig, loadRules]);

  const modifiedCount = useMemo(() => Object.keys(modifiedFlags).length, [modifiedFlags]);

  const totalSectionsCount = useMemo(() => {
    const countItems = (items: any[] = []): number => {
      return items.reduce((acc, item) => {
        return acc + 1 + countItems(item.children);
      }, 0);
    };
    return categories.reduce((acc, cat) => acc + countItems(cat.sections), 0);
  }, [categories]);

  return {
    activeScope,
    setActiveScope,
    selectedRole,
    setSelectedRole,
    selectedAcademy,
    setSelectedAcademy,
    selectedUser,
    setSelectedUser,
    userSearchQuery,
    setUserSearchQuery,
    userSearchResults,
    setUserSearchResults,
    dbRoles,
    dbAcademies,
    dbUsers,
    categories,
    modifiedFlags,
    modifiedCount,
    totalSectionsCount,
    searchFilter,
    setSearchFilter,
    loading,
    saving,
    resetting,
    auditLogs,
    loadingLogs,
    handleToggle,
    handleSaveBatch,
    handleResetOverrides,
    handleClearOverridesGlobally,
    loadRules,
    loadAuditLogs,
  };
}

export default useSectionControl;
