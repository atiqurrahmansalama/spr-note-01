import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchWithAuth } from '../utils/authService';
import { useTenant } from '../context/TenantContext';

/**
 * Enterprise Reusable Academic Hierarchy & Cascading Scope Hook
 * 
 * Manages complete cascading dependencies:
 * Department ➔ Class ➔ Section (if available) ➔ Period Slot (direct or section-bound)
 * 
 * Features:
 * - 100% Zero-hardcoding and tenant-isolated.
 * - Automatic lookup loading if data is not supplied via props.
 * - Bidirectional auto-resolution (e.g. selecting a class auto-detects its department).
 * - Automatic section bypass (when a class has no sections, it connects directly to periods).
 * - Intelligent cascade reset when parent scope changes.
 * 
 * @param {Object} [options]
 * @param {Array} [options.departments] - Pre-loaded departments array
 * @param {Array} [options.classes] - Pre-loaded classes array
 * @param {Array} [options.sections] - Pre-loaded sections array
 * @param {Array} [options.periodSlots] - Pre-loaded period slots array
 * @param {string|number} [options.initialDepartmentId='']
 * @param {string|number} [options.initialClassId='']
 * @param {string|number} [options.initialSectionId='']
 * @param {'ALL'|'SPECIFIC'} [options.initialSectionScope='ALL']
 * @param {string|number} [options.initialPeriodSlotId='']
 * @param {Function} [options.onChange] - Callback fired on any hierarchy change `(hierarchyState) => void`
 */
export function useAcademicHierarchy({
  departments: propDepartments,
  classes: propClasses,
  sections: propSections,
  periodSlots: propPeriodSlots,
  initialDepartmentId = '',
  initialClassId = '',
  initialSectionId = '',
  initialSectionScope = 'ALL',
  initialPeriodSlotId = '',
  onChange,
} = {}) {
  const tenantContext = useTenant ? useTenant() : {};
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  // Internal lookup caches if not provided
  const [internalDepartments, setInternalDepartments] = useState([]);
  const [internalClasses, setInternalClasses] = useState([]);
  const [internalSections, setInternalSections] = useState([]);
  const [internalPeriods, setInternalPeriods] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Lookups if necessary
  useEffect(() => {
    let isMounted = true;
    const fetchMissingLookups = async () => {
      const needsDepts = !propDepartments || propDepartments.length === 0;
      const needsClasses = !propClasses || propClasses.length === 0;
      const needsSections = !propSections || propSections.length === 0;
      const needsPeriods = !propPeriodSlots || propPeriodSlots.length === 0;

      if (!needsDepts && !needsClasses && !needsSections && !needsPeriods) {
        return;
      }

      setLoading(true);
      try {
        const [deptRes, classRes, secRes, slotRes] = await Promise.allSettled([
          needsDepts ? fetchWithAuth('/api/v1/departments/?page_size=500&all=true') : Promise.resolve(null),
          needsClasses ? fetchWithAuth('/api/v1/classes/?page_size=500&all=true') : Promise.resolve(null),
          needsSections ? fetchWithAuth('/api/v1/academy/sections/?page_size=500&all=true') : Promise.resolve(null),
          needsPeriods ? fetchWithAuth('/api/v1/academy/periods/?page_size=500&all=true') : Promise.resolve(null),
        ]);

        if (isMounted) {
          if (deptRes.status === 'fulfilled' && deptRes.value?.ok) {
            const d = await deptRes.value.json();
            setInternalDepartments(Array.isArray(d) ? d : d.results || []);
          }
          if (classRes.status === 'fulfilled' && classRes.value?.ok) {
            const d = await classRes.value.json();
            setInternalClasses(Array.isArray(d) ? d : d.results || []);
          }
          if (secRes.status === 'fulfilled' && secRes.value?.ok) {
            const d = await secRes.value.json();
            setInternalSections(Array.isArray(d) ? d : d.results || []);
          }
          if (slotRes.status === 'fulfilled' && slotRes.value?.ok) {
            const d = await slotRes.value.json();
            setInternalPeriods(Array.isArray(d) ? d : d.results || []);
          }
        }
      } catch (err) {
        console.warn('useAcademicHierarchy: Lookups fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMissingLookups();
    return () => {
      isMounted = false;
    };
  }, [propDepartments, propClasses, propSections, propPeriodSlots, activeTenantId]);

  const effectiveDepartments = propDepartments && propDepartments.length > 0
    ? propDepartments
    : internalDepartments;
  const effectiveClasses = propClasses && propClasses.length > 0
    ? propClasses
    : internalClasses;
  const effectiveSections = propSections && propSections.length > 0
    ? propSections
    : internalSections;
  const effectivePeriodSlots = propPeriodSlots && propPeriodSlots.length > 0
    ? propPeriodSlots
    : internalPeriods;

  // Selected State
  const [departmentId, setDepartmentIdState] = useState(() => String(initialDepartmentId || ''));
  const [classId, setClassIdState] = useState(() => String(initialClassId || ''));
  const [sectionScope, setSectionScopeState] = useState(() => initialSectionScope || 'ALL');
  const [sectionId, setSectionIdState] = useState(() => String(initialSectionId || ''));
  const [periodSlotId, setPeriodSlotIdState] = useState(() => String(initialPeriodSlotId || ''));

  // 1. Filter Classes by selected Department
  const filteredClasses = useMemo(() => {
    if (!departmentId || departmentId === 'ALL') return effectiveClasses;
    return effectiveClasses.filter((c) => {
      const clsDept = c.department !== undefined ? c.department : c.department_id;
      const deptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
      return deptId === String(departmentId);
    });
  }, [effectiveClasses, departmentId]);

  // 2. Available Sections for currently selected Class
  const availableSections = useMemo(() => {
    if (!classId || classId === 'ALL') return [];
    return effectiveSections.filter((sec) => {
      const secClass = sec.student_class !== undefined ? sec.student_class : (sec.student_class_id || sec.class_id || sec.classId || sec.class);
      const sClsId = secClass ? (typeof secClass === 'object' ? String(secClass.id || '') : String(secClass)) : '';
      return sClsId === String(classId);
    });
  }, [effectiveSections, classId]);

  const hasSectionsForClass = availableSections.length > 0;

  // 3. Filter Period Slots based on Class & Section (or directly Class if no sections)
  const filteredPeriods = useMemo(() => {
    return effectivePeriodSlots.filter((p) => {
      // If no class is selected, show institution-wide slots
      if (!classId || classId === 'ALL') return true;

      const rawSlotClass = p.student_class !== undefined ? p.student_class : (p.student_class_id || p.class_id || p.class);
      const slotClassId = rawSlotClass
        ? (typeof rawSlotClass === 'object' ? String(rawSlotClass.id || '') : String(rawSlotClass))
        : '';

      // Institution-wide slots (unassigned class) are available
      if (!slotClassId) return true;

      // Belongs to another class
      if (slotClassId !== String(classId)) return false;

      // If this class has NO sections at all, direct class matching applies
      if (!hasSectionsForClass) return true;

      // Section filtering if class has sections
      const rawSlotSec = p.section !== undefined ? p.section : p.section_id;
      const slotSecId = rawSlotSec
        ? (typeof rawSlotSec === 'object' ? String(rawSlotSec.id || '') : String(rawSlotSec))
        : '';

      // Class-wide slots (not locked to specific section) are valid
      if (!slotSecId) return true;

      // Section-specific slots
      if (sectionScope === 'SPECIFIC' && sectionId) {
        return slotSecId === String(sectionId);
      }

      // If scope is 'ALL', exclude section-locked slots
      return false;
    });
  }, [effectivePeriodSlots, classId, hasSectionsForClass, sectionScope, sectionId]);

  // Resolved metadata objects
  const selectedDepartment = useMemo(() => {
    if (!departmentId) return null;
    return effectiveDepartments.find((d) => String(d.id) === String(departmentId)) || null;
  }, [effectiveDepartments, departmentId]);

  const selectedClass = useMemo(() => {
    if (!classId) return null;
    return effectiveClasses.find((c) => String(c.id) === String(classId)) || null;
  }, [effectiveClasses, classId]);

  const selectedSection = useMemo(() => {
    if (!sectionId) return null;
    return availableSections.find((s) => String(s.id) === String(sectionId)) || null;
  }, [availableSections, sectionId]);

  const selectedPeriodSlot = useMemo(() => {
    if (!periodSlotId) return null;
    return filteredPeriods.find((p) => String(p.id) === String(periodSlotId)) || null;
  }, [filteredPeriods, periodSlotId]);

  // Derived Names
  const departmentName = selectedDepartment?.name || selectedDepartment?.department_name || '';
  const className = selectedClass?.name || selectedClass?.class_name || '';
  const sectionName = selectedSection ? (selectedSection.section_name || `Section ${selectedSection.name || ''}`) : '';
  const periodName = selectedPeriodSlot?.period_name || '';

  // ─── Cascading Handlers ───────────────────────────────────────────────────

  const setDepartment = useCallback((newDeptId) => {
    const val = newDeptId ? String(newDeptId) : '';
    setDepartmentIdState(val);

    // If current class does not belong to new department, reset downstream
    if (val && classId) {
      const clsObj = effectiveClasses.find((c) => String(c.id) === String(classId));
      const clsDept = clsObj?.department !== undefined ? clsObj.department : clsObj?.department_id;
      const clsDeptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
      if (clsDeptId && clsDeptId !== val) {
        setClassIdState('');
        setSectionIdState('');
        setSectionScopeState('ALL');
        setPeriodSlotIdState('');
      }
    }
  }, [classId, effectiveClasses]);

  const setClass = useCallback((newClassId) => {
    const val = newClassId ? String(newClassId) : '';
    setClassIdState(val);

    // Auto-detect Department if none is currently selected
    if (val) {
      const clsObj = effectiveClasses.find((c) => String(c.id) === String(val));
      const clsDept = clsObj?.department !== undefined ? clsObj.department : clsObj?.department_id;
      const clsDeptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
      if (clsDeptId && !departmentId) {
        setDepartmentIdState(clsDeptId);
      }
    }

    // Reset downstream selections on class change
    setSectionIdState('');
    setSectionScopeState('ALL');
    setPeriodSlotIdState('');
  }, [departmentId, effectiveClasses]);

  const setSectionScope = useCallback((newScope) => {
    setSectionScopeState(newScope);
    if (newScope === 'ALL') {
      setSectionIdState('');
      setPeriodSlotIdState('');
    } else if (newScope === 'SPECIFIC' && availableSections.length > 0 && !sectionId) {
      setSectionIdState(String(availableSections[0].id));
      setPeriodSlotIdState('');
    }
  }, [availableSections, sectionId]);

  const setSection = useCallback((newSecId) => {
    const val = newSecId ? String(newSecId) : '';
    setSectionIdState(val);
    setPeriodSlotIdState(''); // Re-evaluate period slot for new section
  }, []);

  const setPeriodSlot = useCallback((newPeriodId) => {
    setPeriodSlotIdState(newPeriodId ? String(newPeriodId) : '');
  }, []);

  const setValues = useCallback(({
    departmentId: dId,
    classId: cId,
    sectionId: sId,
    sectionScope: sScope,
    periodSlotId: pId,
  }) => {
    if (dId !== undefined) setDepartmentIdState(dId ? String(dId) : '');
    if (cId !== undefined) setClassIdState(cId ? String(cId) : '');
    if (sScope !== undefined) setSectionScopeState(sScope || 'ALL');
    if (sId !== undefined) setSectionIdState(sId ? String(sId) : '');
    if (pId !== undefined) setPeriodSlotIdState(pId ? String(pId) : '');
  }, []);

  const resetAll = useCallback(() => {
    setDepartmentIdState('');
    setClassIdState('');
    setSectionScopeState('ALL');
    setSectionIdState('');
    setPeriodSlotIdState('');
  }, []);

  // Sync with parent onChange if provided
  useEffect(() => {
    if (onChange) {
      onChange({
        departmentId,
        departmentName,
        departmentObj: selectedDepartment,
        classId,
        className,
        classObj: selectedClass,
        sectionScope,
        sectionId: (hasSectionsForClass && sectionScope === 'SPECIFIC') ? sectionId : '',
        sectionName: (hasSectionsForClass && sectionScope === 'SPECIFIC') ? sectionName : '',
        sectionObj: (hasSectionsForClass && sectionScope === 'SPECIFIC') ? selectedSection : null,
        hasSectionsForClass,
        periodSlotId,
        periodName,
        periodSlotObj: selectedPeriodSlot,
      });
    }
  }, [
    departmentId,
    departmentName,
    selectedDepartment,
    classId,
    className,
    selectedClass,
    sectionScope,
    sectionId,
    sectionName,
    selectedSection,
    hasSectionsForClass,
    periodSlotId,
    periodName,
    selectedPeriodSlot,
    onChange,
  ]);

  return {
    // Current Values
    departmentId,
    departmentName,
    departmentObj: selectedDepartment,
    classId,
    className,
    classObj: selectedClass,
    sectionScope,
    sectionId: (hasSectionsForClass && sectionScope === 'SPECIFIC') ? sectionId : '',
    sectionName: (hasSectionsForClass && sectionScope === 'SPECIFIC') ? sectionName : '',
    sectionObj: (hasSectionsForClass && sectionScope === 'SPECIFIC') ? selectedSection : null,
    periodSlotId,
    periodName,
    periodSlotObj: selectedPeriodSlot,

    // Hierarchy State
    hasSectionsForClass,
    loading,

    // Filtered Lists & Options
    departments: effectiveDepartments,
    classes: filteredClasses,
    allClasses: effectiveClasses,
    sections: availableSections,
    allSections: effectiveSections,
    periodSlots: filteredPeriods,
    allPeriodSlots: effectivePeriodSlots,

    // Setters
    setDepartmentId: setDepartment,
    setClassId: setClass,
    setSectionScope,
    setSectionId: setSection,
    setPeriodSlotId: setPeriodSlot,
    setValues,
    resetAll,
  };
}
