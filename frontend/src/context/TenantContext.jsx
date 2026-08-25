import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Fetch institutions list if user is Super Admin or has multi-tenant permissions
  const fetchInstitutionsList = useCallback(async () => {
    if (!isMultiTenantAdmin) {
      if (user?.institution_details) {
        setCurrentInstitution(user.institution_details);
      }
      if (user?.institution_id) {
        const instId = String(user.institution_id);
        setActiveTenantId(instId);
        try {
          localStorage.setItem('active_tenant_id', instId);
        } catch {}
      }
      return;
    }

    try {
      setIsLoadingInstitutions(true);
      const data = await getInstitutions();
      const items = Array.isArray(data) ? data : (data.results || []);
      setInstitutions(items);

      const savedTenantId = localStorage.getItem('active_tenant_id');
      if (savedTenantId && savedTenantId !== 'ALL') {
        const found = items.find(i => String(i.id) === String(savedTenantId));
        if (found) {
          setCurrentInstitution(found);
          setActiveTenantId(savedTenantId);
        } else if (items.length > 0) {
          if (isMultiTenantAdmin) {
            setCurrentInstitution(null);
            setActiveTenantId('ALL');
            try {
              localStorage.setItem('active_tenant_id', 'ALL');
            } catch {}
          } else {
            const userInst = user?.institution_id ? items.find(i => String(i.id) === String(user.institution_id)) : null;
            const target = userInst || items[0];
            setCurrentInstitution(target);
            setActiveTenantId(String(target.id));
            try {
              localStorage.setItem('active_tenant_id', String(target.id));
            } catch {}
          }
        }
      } else if (savedTenantId === 'ALL') {
        setCurrentInstitution(null);
        setActiveTenantId('ALL');
      } else if (items.length > 0) {
        // Multi-tenant Admin defaults to ALL (Global Scope) so all data across all institutions is visible immediately
        if (isMultiTenantAdmin) {
          const userInst = user?.institution_id ? items.find(i => String(i.id) === String(user.institution_id)) : null;
          if (userInst) {
            setCurrentInstitution(userInst);
            setActiveTenantId(String(userInst.id));
            try {
              localStorage.setItem('active_tenant_id', String(userInst.id));
            } catch {}
          } else {
            setCurrentInstitution(null);
            setActiveTenantId('ALL');
            try {
              localStorage.setItem('active_tenant_id', 'ALL');
            } catch {}
          }
        } else {
          const userInst = user?.institution_id ? items.find(i => String(i.id) === String(user.institution_id)) : null;
          const target = userInst || items[0];
          setCurrentInstitution(target);
          setActiveTenantId(String(target.id));
          try {
            localStorage.setItem('active_tenant_id', String(target.id));
          } catch {}
        }
      }
    } catch (err) {
      console.error('[TenantProvider] Error loading institutions:', err);
    } finally {
      setIsLoadingInstitutions(false);
    }
  }, [isMultiTenantAdmin, user?.id, user?.institution_id]);

  useEffect(() => {
    fetchInstitutionsList();
  }, [fetchInstitutionsList]);

  // Handle switching active institution
  const switchInstitution = useCallback((targetId) => {
    if (!targetId || targetId === 'ALL') {
      localStorage.setItem('active_tenant_id', 'ALL');
      setActiveTenantId('ALL');
      setCurrentInstitution(null);
    } else {
      localStorage.setItem('active_tenant_id', targetId);
      setActiveTenantId(targetId);
      const found = institutions.find(i => String(i.id) === String(targetId));
      if (found) {
        setCurrentInstitution(found);
      }
    }

    // Dispatch sync event for active views to reload data
    window.dispatchEvent(new CustomEvent('spr_tenant_changed', { detail: { tenantId: targetId } }));
  }, [institutions]);

  const value = {
    institutions,
    currentInstitution,
    activeTenantId,
    isMultiTenantAdmin,
    isLoadingInstitutions,
    switchInstitution,
    refreshInstitutions: fetchInstitutionsList,
  };

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
      isLoadingInstitutions: false,
      switchInstitution: () => {},
      refreshInstitutions: async () => {},
    };
  }
  return context;
}

export default TenantContext;
