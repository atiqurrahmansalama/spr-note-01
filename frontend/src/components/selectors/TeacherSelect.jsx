import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';

/**
 * Enterprise Reusable Teacher / Staff Selector Component
 * 
 * Automatically loads teachers/staff if not provided via props, supports tenant isolation,
 * filters by teaching staff, provides "All Teachers" mode, search, and design token integration.
 * 
 * @param {Object} props
 * @param {string|number} props.value - Selected teacher ID
 * @param {Function} props.onChange - Callback `(selectedVal, selectedTeacherObj) => void`
 * @param {Array} [props.teachers] - Optional pre-loaded teachers/staff array
 * @param {boolean} [props.onlyTeachers=false] - Only show teaching staff
 * @param {string} [props.label='Select Teacher'] - Label text
 * @param {string} [props.placeholder='Select Teacher...'] - Placeholder text
 * @param {boolean} [props.allowAll=true] - Whether to include an "All Teachers" option
 * @param {string} [props.allLabel='All Teachers'] - Label for the "All Teachers" option
 * @param {boolean} [props.required=false] - Required indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.searchable=true] - Enable search filter
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Selector size
 * @param {boolean} [props.compactMode=false] - Compact mode
 * @param {string} [props.error] - Error message
 * @param {React.ComponentType} [props.icon] - Optional leading icon
 * @param {Function} [props.onTeachersLoaded] - Callback when teachers are loaded via API
 */
export default function TeacherSelect({
  value,
  onChange,
  teachers: propTeachers,
  onlyTeachers = false,
  label = 'Select Teacher',
  placeholder = 'Select Teacher...',
  allowAll = true,
  allLabel = 'All Teachers',
  required = false,
  disabled = false,
  searchable = true,
  showBadge = false,
  size = 'md',
  compactMode = false,
  error,
  icon,
  onTeachersLoaded,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [internalTeachers, setInternalTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch staff/teachers if propTeachers is not supplied
  useEffect(() => {
    if (propTeachers && Array.isArray(propTeachers)) {
      setInternalTeachers(propTeachers);
      return;
    }

    let isMounted = true;
    const loadTeachers = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/v1/staff/?page_size=500');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalTeachers(list);
          if (onTeachersLoaded) {
            onTeachersLoaded(list);
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
  }, [propTeachers, activeTenantId]);

  const allTeachers = propTeachers && Array.isArray(propTeachers) ? propTeachers : internalTeachers;

  // Filter only teaching staff if requested
  const filteredTeachers = useMemo(() => {
    if (!onlyTeachers) return allTeachers;
    return allTeachers.filter((t) => {
      const type = t.staff_type || t.type;
      return !type || type === 'TEACHING';
    });
  }, [allTeachers, onlyTeachers]);

  // Format options for CustomSelect
  const options = useMemo(() => {
    const list = [];
    if (allowAll) {
      list.push({
        value: '',
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

      list.push({
        value: String(t.id),
        label: designationStr ? `${nameStr} (${designationStr})` : nameStr,
        typeLabel: showBadge ? (designationStr || 'Staff') : undefined,
        badge: showBadge ? (designationStr || 'Staff') : undefined,
        raw: t,
      });
    });

    return list;
  }, [filteredTeachers, allowAll, allLabel, showBadge]);

  const handleChange = (selectedVal) => {
    const foundObj = filteredTeachers.find((t) => String(t.id) === String(selectedVal)) || null;
    onChange(selectedVal, foundObj);
  };

  return (
    <CustomSelect
      value={value !== undefined && value !== null ? String(value) : ''}
      onChange={handleChange}
      options={options}
      label={label}
      placeholder={loading ? 'Loading teachers...' : placeholder}
      required={required}
      disabled={disabled || loading}
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
