import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { ClassIcon } from '../ui/Icons';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';
import { admissionSettingsStore } from '../../utils/localStore';

export interface ClassItem {
  id: string | number;
  name: string;
  code?: string;
  department?: any;
  department_id?: string | number;
  departmentId?: string | number;
  department_details?: any;
  [key: string]: any;
}

export interface ClassSelectProps {
  value?: string | number;
  onChange: (value: string, selectedObj?: ClassItem | null) => void;
  classes?: ClassItem[];
  departmentId?: string | number | null;
  label?: string;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string;
  autoSelectFirst?: boolean;
  admissionFilter?: boolean;
  branchId?: string | number | null;
  allowedClassIds?: Array<string | number> | null;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compactMode?: boolean;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClassesLoaded?: (classes: ClassItem[]) => void;
  [key: string]: any;
}

/**
 * Enterprise Reusable Class Selector Component
 * 
 * Automatically loads classes if not supplied via props.
 * Supports tenant isolation, admission filters, branch binding, search,
 * and seamless design token synchronization.
 */
export default function ClassSelect({
  value,
  onChange,
  classes: propClasses,
  departmentId = null,
  label = 'Class',
  placeholder = 'Select Class...',
  allowAll = true,
  allLabel = 'All Classes',
  allValue = 'ALL',
  autoSelectFirst = false,
  admissionFilter = false,
  branchId = null,
  allowedClassIds = null,
  required = false,
  disabled = false,
  searchable = false,
  showBadge = false,
  size = 'md',
  compactMode = false,
  error,
  icon = ClassIcon,
  onClassesLoaded,
  ...rest
}: ClassSelectProps) {
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  const [internalClasses, setInternalClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [admissionSettingsVersion, setAdmissionSettingsVersion] = useState(0);

  // Listen to admission settings updates
  useEffect(() => {
    const handleUpdate = () => {
      setAdmissionSettingsVersion((v) => v + 1);
    };
    window.addEventListener('spr_admission_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_admission_settings_updated', handleUpdate);
    };
  }, []);

  // Fetch classes if propClasses is not supplied
  useEffect(() => {
    if (propClasses && Array.isArray(propClasses) && propClasses.length > 0) {
      setInternalClasses(propClasses);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadClasses = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/v1/classes/?page_size=500&all=true');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalClasses(list);
          if (onClassesLoaded) {
            onClassesLoaded(list);
          }
        }
      } catch (err) {
        console.warn('ClassSelect: Failed to load classes:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadClasses();
    return () => {
      isMounted = false;
    };
  }, [propClasses, activeTenantId]);

  const rawClasses = propClasses && Array.isArray(propClasses) && propClasses.length > 0 ? propClasses : internalClasses;

  // Filter classes according to department, admission rules if admissionFilter is true or allowedClassIds provided
  const activeClasses = useMemo(() => {
    let list = rawClasses;
    if (departmentId && departmentId !== 'ALL') {
      const cleanTargetDeptId = String(departmentId).replace(/^dept_/, '').trim().toLowerCase();
      const deptFiltered = list.filter((c) => {
        const dId = c.department !== undefined && c.department !== null
          ? (typeof c.department === 'object' ? c.department.id : c.department)
          : (c.department_id || c.departmentId || c.dept_id || (c.department_details?.id ?? null));
        const cleanDId = String(dId || '').replace(/^dept_/, '').trim().toLowerCase();
        return (
          (dId !== null && dId !== undefined && String(dId) === String(departmentId)) ||
          (cleanDId && cleanTargetDeptId && cleanDId === cleanTargetDeptId)
        );
      });
      if (deptFiltered.length > 0) {
        list = deptFiltered;
      }
    }
    if (Array.isArray(allowedClassIds) && allowedClassIds.length > 0) {
      list = list.filter((c) => {
        const cId = String(c.id !== undefined && c.id !== null ? c.id : c.value ?? '');
        return allowedClassIds.map(String).includes(cId);
      });
    }
    if (admissionFilter) {
      return admissionSettingsStore.getAllowedAdmissionClasses(activeTenantId, branchId, list);
    }
    return list;
  }, [rawClasses, departmentId, allowedClassIds, admissionFilter, activeTenantId, branchId, admissionSettingsVersion]);

  // Auto-select first class if requested
  useEffect(() => {
    if (autoSelectFirst && !allowAll && !value && activeClasses.length > 0) {
      const firstClass = activeClasses[0];
      const firstId = firstClass.id !== undefined && firstClass.id !== null ? firstClass.id : firstClass.value;
      onChange(String(firstId), firstClass);
    }
  }, [autoSelectFirst, allowAll, value, activeClasses, onChange]);

  // Format options for CustomSelect
  const options = useMemo(() => {
    const list: Array<{ value: string; label: string; typeLabel?: string; badge?: string; raw?: ClassItem | null }> = [];
    if (allowAll) {
      list.push({
        value: allValue !== undefined ? allValue : 'ALL',
        label: allLabel,
        raw: null,
      });
    }

    activeClasses.forEach((c) => {
      const classId = String(c.id !== undefined && c.id !== null ? c.id : c.value ?? '');
      // Prevent duplicate 'All Classes' option if already present in passed array
      if (allowAll && (classId === '' || classId === 'ALL' || classId === allValue)) {
        return;
      }

      const className = c.name || c.class_name || c.className || c.label || 'Class';
      const classCode = c.code || c.class_code || c.classCode || '';

      const formattedLabel = classCode && !className.includes(classCode) ? `${className} (${classCode})` : className;

      list.push({
        value: classId,
        label: formattedLabel,
        typeLabel: showBadge ? (classCode || 'Class') : undefined,
        badge: showBadge ? (classCode || 'Class') : undefined,
        raw: c,
      });
    });

    return list;
  }, [activeClasses, allowAll, allLabel, allValue, showBadge]);

  const handleChange = (selectedVal: string) => {
    const foundObj = activeClasses.find((c) => {
      const classId = String(c.id !== undefined && c.id !== null ? c.id : c.value ?? '');
      return classId === String(selectedVal);
    }) || null;
    onChange(selectedVal, foundObj);
  };

  const normalizedValue = useMemo(() => {
    if (value === undefined || value === null) return allowAll ? (allValue !== undefined ? allValue : 'ALL') : '';
    const strVal = String(value);
    if (strVal === '' || strVal === 'ALL') {
      return allowAll ? (allValue !== undefined ? allValue : 'ALL') : '';
    }
    return strVal;
  }, [value, allowAll, allValue]);

  return (
    <CustomSelect
      value={normalizedValue}
      onChange={handleChange}
      options={options}
      label={label}
      placeholder={loading && options.length === 0 ? 'Loading classes...' : placeholder}
      required={required}
      disabled={disabled}
      searchable={searchable}
      showBadge={showBadge}
      size={size}
      compactMode={compactMode}
      error={error}
      icon={icon}
      {...rest}
    />
  );
}
