import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getInstitutions } from '../api/institutions';
import { useAuth } from './AuthContext';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState(() => {
    return localStorage.getItem('active_tenant_id') || '';
  });
  const [currentInstitution, setCurrentInstitution] = useState(null);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);

  const isMultiTenantAdmin = Boolean(
    user && (user.is_superuser || (user.user_type && user.user_type.toUpperCase() === 'SUPER_ADMIN'))
  );

  const isAcademyAdmin = Boolean(
    user && (
      isMultiTenantAdmin ||
      user.is_academy_admin ||
      ['ADMIN', 'DIRECTOR', 'HEADMASTER', 'PRINCIPAL'].includes(String(user.user_type || '').toUpperCase()) ||
      ['ADMIN', 'DIRECTOR', 'HEADMASTER', 'PRINCIPAL'].includes(String(user.role?.code || user.role || '').toUpperCase()) ||
      ['ADMIN', 'DIRECTOR', 'HEADMASTER', 'PRINCIPAL'].includes(String(user.role_info?.code || '').toUpperCase()) ||
      (user.staff_profile && user.staff_profile.staff_type === 'ADMIN')
    )
  );

  const isTenantAdmin = isMultiTenantAdmin || isAcademyAdmin;
  const isAdmin = isMultiTenantAdmin || isAcademyAdmin;

  // Fetch institutions list for multi-tenant admins, academy admins, and institutional personnel
  const fetchInstitutionsList = useCallback(async () => {
    // Immediate optimistic hydration from user profile or staff profile
    if (user?.institution_details && !currentInstitution) {
      setCurrentInstitution(user.institution_details);
    }
    const resolvedInstId = user?.institution_id || user?.staff_profile?.institution_id || user?.institution_details?.id;
    if (resolvedInstId && (!activeTenantId || activeTenantId === 'null' || activeTenantId === 'undefined')) {
      const instId = String(resolvedInstId);
      setActiveTenantId(instId);
      try {
        localStorage.setItem('active_tenant_id', instId);
        localStorage.setItem('spr_active_tenant_id', instId);
      } catch {}
    }

    try {
      setIsLoadingInstitutions(true);
      const data = await getInstitutions();
      const items = Array.isArray(data) ? data : (data.results || []);
      setInstitutions(items);

      const savedTenantId =
        localStorage.getItem('active_tenant_id') ||
        localStorage.getItem('spr_active_tenant_id') ||
        user?.institution_id ||
        user?.staff_profile?.institution_id;

      if (savedTenantId && savedTenantId !== 'ALL' && savedTenantId !== 'null' && savedTenantId !== 'undefined') {
        const found = items.find(i => String(i.id) === String(savedTenantId));
        if (found) {
          setCurrentInstitution(found);
          setActiveTenantId(String(savedTenantId));
          try {
            localStorage.setItem('active_tenant_id', String(savedTenantId));
            localStorage.setItem('spr_active_tenant_id', String(savedTenantId));
          } catch {}
          return;
        }
      } else if (savedTenantId === 'ALL' && isMultiTenantAdmin) {
        setCurrentInstitution(null);
        setActiveTenantId('ALL');
        return;
      }

      // If user profile has pre-resolved institution details, anchor to it
      if (user?.institution_details) {
        setCurrentInstitution(user.institution_details);
        setActiveTenantId(String(user.institution_details.id));
        return;
      }

      // If no valid savedTenantId (e.g. initial login or switched environment):
      if (items.length > 0) {
        // Priority 1: User's explicitly assigned institution
        const targetInstId = user?.institution_id || user?.staff_profile?.institution_id;
        const userInst = targetInstId ? items.find(i => String(i.id) === String(targetInstId)) : null;
        // Priority 2: Primary production academy matching Darus Salam (DS)
        const preferredInst = items.find(i => 
          /darus\s*salam/i.test(i.name || '') || 
          /\bds\b/i.test(i.code || '') || 
          /darus/i.test(i.slug || '')
        );
        const target = userInst || preferredInst || items[0];
        setCurrentInstitution(target);
        setActiveTenantId(String(target.id));
        try {
          localStorage.setItem('active_tenant_id', String(target.id));
          localStorage.setItem('spr_active_tenant_id', String(target.id));
        } catch {}
      }
    } catch (err) {
      console.error('[TenantProvider] Error loading institutions:', err);
      if (user?.institution_details) {
        setCurrentInstitution(user.institution_details);
        setActiveTenantId(String(user.institution_details.id));
      } else if (user?.institution_name || user?.institution_id || isAcademyAdmin) {
        const fallbackInst = {
          id: String(user?.institution_id || 'inst-ds-01'),
          name: user?.institution_name || 'Darus Salam Islamic School (DS)',
          code: 'DS',
        };
        setCurrentInstitution(fallbackInst);
        setActiveTenantId(String(fallbackInst.id));
      }
    } finally {
      setIsLoadingInstitutions(false);
    }
  }, [isMultiTenantAdmin, isAcademyAdmin, user?.id, user?.institution_id, user?.institution_details, user?.institution_name, user?.staff_profile]);

  useEffect(() => {
    fetchInstitutionsList();
  }, [fetchInstitutionsList]);

  const [pendingSwitchInstitution, setPendingSwitchInstitution] = useState(null);

  // Handle switching active institution
  const switchInstitution = useCallback((targetId) => {
    let targetName = 'All Institutions';
    if (!targetId || targetId === 'ALL') {
      localStorage.setItem('active_tenant_id', 'ALL');
      localStorage.setItem('spr_active_tenant_id', 'ALL');
      setActiveTenantId('ALL');
      setCurrentInstitution(null);
    } else {
      localStorage.setItem('active_tenant_id', targetId);
      localStorage.setItem('spr_active_tenant_id', targetId);
      setActiveTenantId(targetId);
      const found = institutions.find(i => String(i.id) === String(targetId));
      if (found) {
        setCurrentInstitution(found);
        targetName = found.name;
      }
    }

    // Dispatch sync event for active views to reload data
    window.dispatchEvent(new CustomEvent('spr_tenant_changed', { detail: { tenantId: targetId, targetName } }));
  }, [institutions]);

  const requestSwitchInstitution = useCallback((target) => {
    if (!target) return;
    if (target === 'ALL') {
      if (activeTenantId === 'ALL') return;
      setPendingSwitchInstitution({
        id: 'ALL',
        name: 'All Institutions',
        slug: 'global',
        institution_type: 'GLOBAL',
        description: 'Viewing aggregate data across all registered institutions.',
      });
      return;
    }

    const instObj = typeof target === 'object' ? target : institutions.find(i => String(i.id) === String(target));
    if (instObj) {
      if (String(instObj.id) === String(activeTenantId)) return;
      setPendingSwitchInstitution(instObj);
    }
  }, [institutions, activeTenantId]);

  const confirmSwitchInstitution = useCallback(() => {
    if (!pendingSwitchInstitution) return;
    const targetId = pendingSwitchInstitution.id;
    switchInstitution(targetId);
    setPendingSwitchInstitution(null);
  }, [pendingSwitchInstitution, switchInstitution]);

  const cancelSwitchInstitution = useCallback(() => {
    setPendingSwitchInstitution(null);
  }, []);

  const value = useMemo(
    () => ({
      institutions,
      currentInstitution,
      activeTenant: currentInstitution,
      activeTenantId: activeTenantId || (currentInstitution?.id ? String(currentInstitution.id) : 'default'),
      isMultiTenantAdmin,
      isAcademyAdmin,
      isTenantAdmin,
      isAdmin,
      isLoadingInstitutions,
      switchInstitution,
      pendingSwitchInstitution,
      requestSwitchInstitution,
      confirmSwitchInstitution,
      cancelSwitchInstitution,
      refreshInstitutions: fetchInstitutionsList,
    }),
    [
      institutions,
      currentInstitution,
      activeTenantId,
      isMultiTenantAdmin,
      isAcademyAdmin,
      isTenantAdmin,
      isAdmin,
      isLoadingInstitutions,
      switchInstitution,
      pendingSwitchInstitution,
      requestSwitchInstitution,
      confirmSwitchInstitution,
      cancelSwitchInstitution,
      fetchInstitutionsList,
    ]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    return {
      institutions: [],
      currentInstitution: null,
      activeTenantId: typeof localStorage !== 'undefined' ? (localStorage.getItem('active_tenant_id') || 'default') : 'default',
      isMultiTenantAdmin: false,
      isAcademyAdmin: false,
      isTenantAdmin: false,
      isAdmin: false,
      isLoadingInstitutions: false,
      switchInstitution: () => {},
      pendingSwitchInstitution: null,
      requestSwitchInstitution: () => {},
      confirmSwitchInstitution: () => {},
      cancelSwitchInstitution: () => {},
      refreshInstitutions: async () => {},
    };
  }
  return context;
}

export default TenantContext;
