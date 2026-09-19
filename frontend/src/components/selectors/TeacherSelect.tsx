import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { TeacherIcon } from '../ui/Icons';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';

export interface TeacherItem {
  id: string | number;
  user?: string | number;
  user_name?: string;
  name?: string;
  name_en?: string;
  full_name?: string;
  bangla_name?: string;
  user_phone?: string;
  user_email?: string;
  user_type?: string;
  staff_type?: string;
  type?: string;
  designation?: string;
  employee_id?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface TeacherSelectProps {
  value?: string | number | null;
  onChange: (value: any, item?: any) => void;
  teachers?: TeacherItem[];
  onlyTeachers?: boolean;
  valueKey?: 'user' | 'id';
  label?: string;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string | number;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compactMode?: boolean;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onTeachersLoaded?: (teachers: TeacherItem[]) => void;
  [key: string]: any;
}

/**
 * Enterprise Reusable Teacher / Staff Selector Component
 * 
 * Automatically loads teachers/staff from `/api/v1/staff/` if not provided via props,
 * supports tenant isolation, filters by teaching staff, provides "All Teachers" mode,
 * search, and design token integration.
 */
export default function TeacherSelect({
  value,
  onChange,
  teachers: propTeachers,
  onlyTeachers = false,
  valueKey = 'user',
  label = 'Select Teacher',
  placeholder = 'Select Teacher...',
  allowAll = true,
  allLabel = 'All Teachers',
  allValue = 'ALL',
  required = false,
  disabled = false,
  searchable = false,
  showBadge = false,
  size = 'md',
  compactMode = false,
  error,
  icon = TeacherIcon,
  onTeachersLoaded,
  ...rest
}: TeacherSelectProps) {
  const { activeTenantId } = useTenant();
  const [internalTeachers, setInternalTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch staff/teachers if propTeachers is not supplied
  useEffect(() => {
    if (propTeachers && Array.isArray(propTeachers) && propTeachers.length > 0) {
      setInternalTeachers(propTeachers);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadTeachers = async () => {
      setLoading(true);
      try {
        const tenantQuery = activeTenantId && activeTenantId !== 'ALL' ? `&institution=${activeTenantId}` : '';
        const typeQuery = onlyTeachers ? '&staff_type=TEACHING' : '';
        const res = await fetchWithAuth(`/api/v1/staff/?page_size=500${tenantQuery}${typeQuery}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          const activeList = list.filter((s: TeacherItem) => !s.is_deleted && s.is_active);
          setInternalTeachers(activeList);
          if (onTeachersLoaded) {
            onTeachersLoaded(activeList);
          }
        }
      } catch (err) {
        console.warn('TeacherSelect: Failed to load teachers:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTeachers();
    return () => {
      isMounted = false;
    };
  }, [propTeachers, activeTenantId, onlyTeachers]);

  const rawTeachers = propTeachers && Array.isArray(propTeachers) && propTeachers.length > 0 ? propTeachers : internalTeachers;

  // Filter only teaching staff if requested
  const filteredTeachers = useMemo(() => {
    if (!onlyTeachers) return rawTeachers;
    return rawTeachers.filter((t) => {
      const type = (t.staff_type || t.type || t.user_type || '').toUpperCase();
      return !type || type === 'TEACHING' || type === 'TEACHER';
    });
  }, [rawTeachers, onlyTeachers]);

  // Format options for CustomSelect
  const options = useMemo(() => {
    const list: Array<{ value: string; label: string; typeLabel?: string; badge?: string; raw: TeacherItem | null }> = [];
    if (allowAll) {
      list.push({
        value: allValue !== undefined ? String(allValue) : 'ALL',
        label: allLabel,
        raw: null,
      });
    }

    filteredTeachers.forEach((t) => {
      const nameStr =
        t.name_en ||
        t.user_name ||
        t.name ||
        t.full_name ||
        t.employee_id ||
        (t.user_phone ? `Teacher (${t.user_phone})` : `Teacher #${t.id}`);
      const designationStr = t.designation || (t.staff_type === 'TEACHING' ? 'Teacher' : '');
      const itemValue = valueKey === 'user' ? String(t.user || t.id) : String(t.id || t.user);

      list.push({
        value: itemValue,
        label: designationStr ? `${nameStr} (${designationStr})` : nameStr,
        typeLabel: showBadge ? (designationStr || 'Staff') : undefined,
        badge: showBadge ? (designationStr || 'Staff') : undefined,
        raw: t,
      });
    });

    return list;
  }, [filteredTeachers, allowAll, allLabel, allValue, showBadge, valueKey]);

  const handleChange = (selectedVal: string | number) => {
    const foundObj = filteredTeachers.find((t) => {
      const itemVal = valueKey === 'user' ? String(t.user || t.id) : String(t.id || t.user);
      return itemVal === String(selectedVal) || String(t.id) === String(selectedVal) || String(t.user) === String(selectedVal);
    }) || null;
    onChange(selectedVal, foundObj);
  };

  const normalizedValue = useMemo(() => {
    if (value === undefined || value === null) return allowAll ? (allValue !== undefined ? String(allValue) : 'ALL') : '';
    const strVal = String(value);
    if (strVal === '' || strVal === 'ALL') {
      return allowAll ? (allValue !== undefined ? String(allValue) : 'ALL') : '';
    }
    return strVal;
  }, [value, allowAll, allValue]);

  return (
    <CustomSelect
      value={normalizedValue}
      onChange={handleChange}
      options={options}
      label={label}
      placeholder={loading && options.length === 0 ? 'Loading teachers...' : placeholder}
      required={required}
      disabled={disabled}
      searchable={searchable && options.length > 5}
      showBadge={showBadge}
      size={size}
      compactMode={compactMode}
      error={error}
      icon={icon}
      {...rest}
    />
  );
}
