import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getInstitutions } from '../api/institutions';
import { useAuth } from './AuthContext';
import { isUserSuperAdmin, isUserAcademyAdmin } from '../utils/roleUtils';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState(() => {
    if (user?.available_institutions && Array.isArray(user.available_institutions) && user.available_institutions.length > 0) {
      return user.available_institutions;
    }
    return [];
  });
  const [activeTenantId, setActiveTenantId] = useState(() => {
    return localStorage.getItem('active_tenant_id') || '';
  });
  const [currentInstitution, setCurrentInstitution] = useState(null);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);

  const isMultiTenantAdmin = isUserSuperAdmin(user);

  const isAcademyAdmin = isUserAcademyAdmin(user, isMultiTenantAdmin);

  const isTenantAdmin = isMultiTenantAdmin || isAcademyAdmin;
  const isAdmin = isMultiTenantAdmin || isAcademyAdmin;

  const availableInstitutions = useMemo(() => {
    if (institutions && institutions.length > 0) return institutions;
    if (user?.available_institutions && user.available_institutions.length > 0) return user.available_institutions;
    if (currentInstitution) return [currentInstitution];
    return [];
  }, [institutions, user?.available_institutions, currentInstitution]);

  const hasMultipleInstitutions = useMemo(() => {
    return availableInstitutions.length > 1 || Boolean(user?.is_multi_institution);
  }, [availableInstitutions, user?.is_multi_institution]);

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
      const allPool = institutions.length > 0 ? institutions : (user?.available_institutions || []);
      const found = allPool.find(i => String(i.id) === String(targetId));
      if (found) {
        setCurrentInstitution(found);
        targetName = found.name;
      }
    }

    // Dispatch sync event for active views to reload data
    window.dispatchEvent(new CustomEvent('spr_tenant_changed', { detail: { tenantId: targetId, targetName } }));
  }, [institutions, user?.available_institutions]);

  const requestSwitchInstitution = useCallback((target) => {
    const targetId = typeof target === 'object' && target ? target.id : target;
    if (targetId) switchInstitution(targetId);
  }, [switchInstitution]);

  const value = useMemo(
    () => ({
      institutions,
      availableInstitutions,
      hasMultipleInstitutions,
      currentInstitution,
      activeTenant: currentInstitution,
      activeTenantId: activeTenantId || (currentInstitution?.id ? String(currentInstitution.id) : 'default'),
      isMultiTenantAdmin,
      isAcademyAdmin,
      isTenantAdmin,
      isAdmin,
      isLoadingInstitutions,
      switchInstitution,
      requestSwitchInstitution,
      refreshInstitutions: fetchInstitutionsList,
    }),
    [
      institutions,
      availableInstitutions,
      hasMultipleInstitutions,
      currentInstitution,
      activeTenantId,
      isMultiTenantAdmin,
      isAcademyAdmin,
      isTenantAdmin,
      isAdmin,
      isLoadingInstitutions,
      switchInstitution,
      requestSwitchInstitution,
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
      availableInstitutions: [],
      hasMultipleInstitutions: false,
      currentInstitution: null,
      activeTenantId: typeof localStorage !== 'undefined' ? (localStorage.getItem('active_tenant_id') || 'default') : 'default',
      isMultiTenantAdmin: false,
      isAcademyAdmin: false,
      isTenantAdmin: false,
      isAdmin: false,
      isLoadingInstitutions: false,
      switchInstitution: () => {},
      requestSwitchInstitution: () => {},
      refreshInstitutions: async () => {},
    };
  }
  return context;
}

export default TenantContext;
