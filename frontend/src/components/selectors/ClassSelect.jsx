import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';
import { admissionSettingsStore } from '../../utils/localStore';

/**
 * Enterprise Reusable Class Selector Component
 * 
 * Automatically loads classes if not supplied via props.
 * Supports tenant isolation, admission filters, branch binding, search,
 * and seamless design token synchronization.
 * 
 * @param {Object} props
 * @param {string|number} props.value - Selected class ID
 * @param {Function} props.onChange - Callback `(selectedVal, selectedClassObj) => void`
 * @param {Array} [props.classes] - Optional pre-loaded classes array
 * @param {string} [props.label='Select Class'] - Label text (or null to hide)
 * @param {string} [props.placeholder='Select Class...'] - Placeholder text
 * @param {boolean} [props.allowAll=true] - Whether to include an "All Classes" option
 * @param {string} [props.allLabel='All Classes'] - Label for the "All Classes" option
 * @param {string} [props.allValue='ALL'] - Value for the "All Classes" option
 * @param {boolean} [props.autoSelectFirst=false] - Auto select first class if none selected & allowAll is false
 * @param {boolean} [props.admissionFilter=false] - Whether to apply admission settings filter
 * @param {string|number} [props.branchId=null] - Target branch ID for admission rules
 * @param {Array} [props.allowedClassIds=null] - Explicit allowed class IDs array
 * @param {boolean} [props.required=false] - Required indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.searchable=true] - Enable search filter
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Selector size
 * @param {boolean} [props.compactMode=false] - Compact mode
 * @param {string} [props.error] - Error message
 * @param {React.ComponentType} [props.icon] - Optional leading icon
 * @param {Function} [props.onClassesLoaded] - Callback when classes are loaded via API
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
  icon,
  onClassesLoaded,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [internalClasses, setInternalClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [admissionSettingsVersion, setAdmissionSettingsVersion] = useState(0);

  // Listen to admission settings updates
  useEffect(() => {
    const handleUpdate = () => {
      setAdmissionSettingsVersion((v) => v + 1);
    };
    window.addEventListener("spr_admission_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("spr_admission_settings_updated", handleUpdate);
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
      const deptFiltered = list.filter((c) => {
        const dId = c.department !== undefined && c.department !== null
          ? (typeof c.department === 'object' ? c.department.id : c.department)
          : (c.department_id || (c.department_details?.id ?? null));
        return dId !== null && dId !== undefined && String(dId) === String(departmentId);
      });
      if (deptFiltered.length > 0) {
        list = deptFiltered;
      }
    }
    if (Array.isArray(allowedClassIds) && allowedClassIds.length > 0) {
      list = list.filter((c) => allowedClassIds.map(String).includes(String(c.id)));
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
      onChange(String(firstClass.id), firstClass);
    }
  }, [autoSelectFirst, allowAll, value, activeClasses, onChange]);

  // Format options for CustomSelect
  const options = useMemo(() => {
    const list = [];
    if (allowAll) {
      list.push({
        value: allValue !== undefined ? allValue : 'ALL',
        label: allLabel,
        raw: null,
      });
    }

    activeClasses.forEach((c) => {
      list.push({
        value: String(c.id),
        label: c.code ? `${c.name} (${c.code})` : c.name,
        typeLabel: showBadge ? (c.code || 'Class') : undefined,
        badge: showBadge ? (c.code || 'Class') : undefined,
        raw: c,
      });
    });

    return list;
  }, [activeClasses, allowAll, allLabel, allValue, showBadge]);

  const handleChange = (selectedVal) => {
    const foundObj = activeClasses.find((c) => String(c.id) === String(selectedVal)) || null;
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
