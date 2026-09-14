import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { DepartmentIcon } from '../ui/Icons';
import { useTenant } from '../../context/TenantContext';
import { getDepartments } from '../../api/academy';

export interface DepartmentItem {
  id: string | number;
  name?: string;
  department_name?: string;
  name_bn?: string;
  code?: string;
  type?: string;
  department_type?: string;
  description?: string;
  [key: string]: any;
}

export interface DepartmentSelectProps {
  value?: string | number | null;
  onChange?: (selectedValue: string, selectedDeptObj?: DepartmentItem | null) => void;
  departments?: DepartmentItem[];
  label?: string;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string;
  autoSelectFirst?: boolean;
  optional?: boolean;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compactMode?: boolean;
  error?: string | null;
  icon?: React.ComponentType<{ className?: string }> | null;
  onDepartmentsLoaded?: (departments: DepartmentItem[]) => void;
  [key: string]: any;
}

/**
 * Enterprise Reusable Department Selector Component
 * 
 * Automatically loads departments if not supplied via props.
 * Supports tenant isolation, reactive updates, search, and design token synchronization.
 */
export default function DepartmentSelect({
  value,
  onChange,
  departments: propDepartments,
  label = 'Department',
  placeholder = 'All Departments (Institution-Wide)',
  allowAll = true,
  allLabel = 'All Departments (Institution-Wide)',
  allValue = '',
  autoSelectFirst = false,
  optional = false,
  required = false,
  disabled = false,
  searchable = false,
  showBadge = false,
  size = 'md',
  compactMode = false,
  error = null,
  icon = DepartmentIcon,
  onDepartmentsLoaded,
  ...rest
}: DepartmentSelectProps) {
  const tenantContext = useTenant ? useTenant() : { activeTenantId: 'default' };
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  const [internalDepartments, setInternalDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updateVersion, setUpdateVersion] = useState<number>(0);

  // Listen to external department update events
  useEffect(() => {
    const handleUpdate = () => {
      setUpdateVersion((v) => v + 1);
    };
    window.addEventListener('spr_departments_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_departments_updated', handleUpdate);
    };
  }, []);

  // Fetch departments if not supplied via props
  useEffect(() => {
    if (propDepartments && Array.isArray(propDepartments) && propDepartments.length > 0) {
      setInternalDepartments(propDepartments);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadDepartments = async () => {
      setLoading(true);
      try {
        const data = await getDepartments({ page_size: 500, all: true });
        if (isMounted) {
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalDepartments(list);
          if (onDepartmentsLoaded) {
            onDepartmentsLoaded(list);
          }
        }
      } catch (err) {
        console.warn('DepartmentSelect: Failed to load departments:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDepartments();
    return () => {
      isMounted = false;
    };
  }, [propDepartments, activeTenantId, updateVersion, onDepartmentsLoaded]);

  const effectiveDepartments = propDepartments && propDepartments.length > 0
    ? propDepartments
    : internalDepartments;

  // Build Options List
  const options = useMemo(() => {
    const opts: any[] = [];

    if (allowAll) {
      opts.push({
        value: allValue !== undefined ? allValue : '',
        label: allLabel,
        description: 'Institution-wide department scope',
      });
    }

    effectiveDepartments.forEach((dept) => {
      const deptId = String(dept.id !== undefined && dept.id !== null ? dept.id : dept.value ?? '');
      // Prevent duplicate 'All Departments' if already present in passed array
      if (allowAll && (deptId === '' || deptId === 'ALL' || deptId === allValue)) {
        return;
      }

      const name = dept.name || dept.department_name || dept.departmentName || dept.label || 'Department';
      const nameBn = dept.name_bn || '';
      const displayLabel = nameBn && !name.includes(nameBn) ? `${name} (${nameBn})` : name;

      opts.push({
        value: deptId,
        label: displayLabel,
        name: name,
        name_bn: nameBn,
        code: dept.code,
        type: dept.type || dept.department_type,
        typeLabel: dept.type || dept.department_type,
        description: dept.description || '',
        raw: dept,
      });
    });

    return opts;
  }, [effectiveDepartments, allowAll, allLabel, allValue]);

  // Handle Selection Change
  const handleChange = (selectedVal: any) => {
    if (!onChange) return;
    const matchedOption = options.find((opt) => String(opt.value) === String(selectedVal));
    const matchedDeptObj = matchedOption?.raw || null;
    onChange(String(selectedVal), matchedDeptObj);
  };

  // Auto Select First option if required and not chosen
  useEffect(() => {
    if (
      autoSelectFirst &&
      !value &&
      !allowAll &&
      options.length > 0 &&
      onChange
    ) {
      handleChange(options[0].value);
    }
  }, [autoSelectFirst, value, allowAll, options]);

  return (
    <CustomSelect
      label={label}
      required={required}
      placeholder={loading ? 'Loading departments...' : placeholder}
      options={options}
      value={value !== undefined && value !== null ? String(value) : allValue}
      onChange={handleChange}
      disabled={disabled || loading}
      searchable={searchable}
      showBadge={showBadge}
      size={size}
      compactMode={compactMode}
      error={error || undefined}
      icon={icon}
      {...rest}
    />
  );
}
