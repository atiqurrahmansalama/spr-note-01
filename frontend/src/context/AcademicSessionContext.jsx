import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from './TenantContext';
import { academicYearsStore, getAcademicYearStatus } from '../utils/stores/academicStore';
import { getBranches } from '../api/academy';

/**
 * AcademicSessionContext
 * ========================
 * Central Global Context for the active Academic Hierarchy:
 *   Academy (Tenant) > Branch > Academic Year > Semester (Term) > Classes & Students
 *
 * Provides:
 *  - activeBranch / setActiveBranch   → selected campus/branch
 *  - activeYear / setActiveYear       → selected academic year (e.g. 2026-2027)
 *  - activeSemester / setActiveSemester → selected semester/term within the year
 *  - branches                         → all available branches
 *  - academicYears                    → all academic years for active tenant
 *  - terms                            → terms belonging to activeYear
 *  - isSessionReady                   → true once initial data is loaded
 *
 * All modules should consume this context instead of independently calling
 * academicYearsStore or fetching branch data on their own.
 */

const AcademicSessionContext = createContext(null);

const STORAGE_KEY_BRANCH = 'spr_active_branch_id';
const STORAGE_KEY_YEAR = 'spr_active_academic_year_id';
const STORAGE_KEY_SEMESTER = 'spr_active_semester_id';

export function AcademicSessionProvider({ children }) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || 'default';

  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [isSessionReady, setIsSessionReady] = useState(false);

  // Persisted selections — read from localStorage on init
  const [activeBranchId, setActiveBranchIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY_BRANCH) || ''
  );
  const [activeYearId, setActiveYearIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY_YEAR) || ''
  );
  const [activeSemesterId, setActiveSemesterIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY_SEMESTER) || ''
  );

  // ─── Setters with Persistence ─────────────────────────────────────────────

  const setActiveBranch = useCallback((branch) => {
    const id = typeof branch === 'object' ? (branch?.id || '') : branch;
    setActiveBranchIdState(String(id));
    try { localStorage.setItem(STORAGE_KEY_BRANCH, String(id)); } catch {}
    window.dispatchEvent(new CustomEvent('spr_active_session_changed', {
      detail: { type: 'branch', id },
    }));
  }, []);

  const setActiveYear = useCallback((year) => {
    const id = typeof year === 'object' ? (year?.id || '') : year;
    setActiveYearIdState(String(id));
    // Reset semester when year changes
    setActiveSemesterIdState('');
    try {
      localStorage.setItem(STORAGE_KEY_YEAR, String(id));
      localStorage.removeItem(STORAGE_KEY_SEMESTER);
    } catch {}
    window.dispatchEvent(new CustomEvent('spr_active_session_changed', {
      detail: { type: 'year', id },
    }));
  }, []);

  const setActiveSemester = useCallback((semester) => {
    const id = typeof semester === 'object' ? (semester?.id || '') : semester;
    setActiveSemesterIdState(String(id));
    try { localStorage.setItem(STORAGE_KEY_SEMESTER, String(id)); } catch {}
    window.dispatchEvent(new CustomEvent('spr_active_session_changed', {
      detail: { type: 'semester', id },
    }));
  }, []);

  // ─── Load Academic Years (Local Store + Event Sync) ──────────────────────

  const loadAcademicYears = useCallback(() => {
    const years = academicYearsStore.getAcademicYears(tenantId);
    setAcademicYears(years);

    // Auto-select active year based on current date (today) or user-persisted preference
    const savedYearId = localStorage.getItem(STORAGE_KEY_YEAR);
    const dateBasedActiveYear = years.find((y) => getAcademicYearStatus(y.startDate, y.endDate) === "ACTIVE");

    let currentYear = null;
    if (savedYearId) {
      currentYear = years.find((y) => String(y.id) === savedYearId);
    }
    // If no saved year or not found in list, default strictly to current date's active year
    if (!currentYear && years.length > 0) {
      currentYear = dateBasedActiveYear || years.find((y) => y.isCurrent) || years[0];
    }

    if (currentYear) {
      setActiveYearIdState(String(currentYear.id));
      try { localStorage.setItem(STORAGE_KEY_YEAR, String(currentYear.id)); } catch {}

      // Auto-select current semester/term based on current date
      const savedSemesterId = localStorage.getItem(STORAGE_KEY_SEMESTER);
      const today = new Date().toISOString().split("T")[0];
      const dateBasedTerm = currentYear.terms?.find((t) => t.startDate && t.endDate && today >= t.startDate && today <= t.endDate);

      let currentTerm = null;
      if (savedSemesterId) {
        currentTerm = currentYear.terms?.find((t) => String(t.id) === savedSemesterId);
      }
      if (!currentTerm) {
        currentTerm = dateBasedTerm || currentYear.terms?.find((t) => t.isCurrent) || currentYear.terms?.[0];
      }

      if (currentTerm) {
        setActiveSemesterIdState(String(currentTerm.id));
        try { localStorage.setItem(STORAGE_KEY_SEMESTER, String(currentTerm.id)); } catch {}
      }
    }
  }, [tenantId]);

  // ─── Load Branches (API) ─────────────────────────────────────────────────

  const loadBranches = useCallback(async () => {
    try {
      if (typeof getBranches === 'function') {
        const result = await getBranches({ type: 'ALL' });
        const list = Array.isArray(result) ? result : result?.results || [];
        const activeBranches = list.filter((b) => !b.is_deleted);
        setBranches(activeBranches);

        // Auto-select first branch if nothing persisted or saved branch is not in activeBranches
        const savedBranchId = localStorage.getItem(STORAGE_KEY_BRANCH);
        const existsInCurrent = activeBranches.some((b) => String(b.id) === savedBranchId);
        if ((!savedBranchId || !existsInCurrent) && activeBranches.length > 0) {
          const main = activeBranches.find(
            (b) => b.branch_type === 'MAIN_CAMPUS' || b.campus_type === 'MAIN_CAMPUS'
          ) || activeBranches[0];
          setActiveBranchIdState(String(main.id));
          try { localStorage.setItem(STORAGE_KEY_BRANCH, String(main.id)); } catch {}
        }
      }
    } catch {
      // Branch API might not exist in all setups — gracefully degrade
    }
  }, []);

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    setIsSessionReady(false);

    const init = async () => {
      loadAcademicYears();
      await loadBranches();
      setIsSessionReady(true);
    };

    init();
  }, [tenantId, loadAcademicYears, loadBranches]);

  // ─── React to System-Wide Update Events ──────────────────────────────────

  useEffect(() => {
    const handleYearsUpdate = () => loadAcademicYears();
    const handleBranchUpdate = () => loadBranches();
    const handleTenantChange = () => {
      loadAcademicYears();
      loadBranches();
    };

    window.addEventListener('spr_academic_years_updated', handleYearsUpdate);
    window.addEventListener('spr_branches_updated', handleBranchUpdate);
    window.addEventListener('spr_tenant_changed', handleTenantChange);

    return () => {
      window.removeEventListener('spr_academic_years_updated', handleYearsUpdate);
      window.removeEventListener('spr_branches_updated', handleBranchUpdate);
      window.removeEventListener('spr_tenant_changed', handleTenantChange);
    };
  }, [loadAcademicYears, loadBranches]);

  // ─── Derived Values ───────────────────────────────────────────────────────

  const activeBranch = useMemo(() => {
    if (!branches || branches.length === 0) return null;
    const found = branches.find((b) => String(b.id) === activeBranchId);
    if (found) return found;
    return branches.find(
      (b) => b.branch_type === 'MAIN_CAMPUS' || b.campus_type === 'MAIN_CAMPUS'
    ) || branches[0] || null;
  }, [branches, activeBranchId]);

  const activeYear = useMemo(
    () =>
      academicYears.find((y) => String(y.id) === activeYearId) ||
      academicYears.find((y) => y.isCurrent) ||
      academicYears[0] ||
      null,
    [academicYears, activeYearId]
  );

  const terms = useMemo(() => activeYear?.terms || [], [activeYear]);

  const activeSemester = useMemo(
    () =>
      terms.find((t) => String(t.id) === activeSemesterId) ||
      terms.find((t) => t.isCurrent) ||
      terms[0] ||
      null,
    [terms, activeSemesterId]
  );

  // ─── Context Value ────────────────────────────────────────────────────────

  const contextValue = useMemo(
    () => ({
      // Data
      branches,
      academicYears,
      terms,
      // Active Selections (objects)
      activeBranch,
      activeYear,
      activeSemester,
      // Active IDs (strings) — for quick filter comparisons
      activeBranchId,
      activeYearId,
      activeSemesterId: activeSemester?.id || activeSemesterId,
      // Setters
      setActiveBranch,
      setActiveYear,
      setActiveSemester,
      // State
      isSessionReady,
    }),
    [
      branches, academicYears, terms,
      activeBranch, activeYear, activeSemester,
      activeBranchId, activeYearId, activeSemesterId,
      setActiveBranch, setActiveYear, setActiveSemester,
      isSessionReady,
    ]
  );

  return (
    <AcademicSessionContext.Provider value={contextValue}>
      {children}
    </AcademicSessionContext.Provider>
  );
}

/**
 * useAcademicSession
 * -------------------
 * Central hook to consume the Global Academic Session context.
 * Replaces direct calls to academicYearsStore.getActiveYear() across all modules.
 *
 * @example
 *   const { activeYear, activeSemester, activeBranch } = useAcademicSession();
 */
export function useAcademicSession() {
  const ctx = useContext(AcademicSessionContext);
  if (!ctx) {
    throw new Error('useAcademicSession must be used within an AcademicSessionProvider.');
  }
  return ctx;
}

export default AcademicSessionContext;
