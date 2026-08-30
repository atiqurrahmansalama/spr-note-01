import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { DepartmentIcon } from '../ui/Icons';
import { useTenant } from '../../context/TenantContext';
import { getDepartments } from '../../api/academy';

/**
 * Enterprise Reusable Department Selector Component
 * 
 * Automatically loads departments if not supplied via props.
 * Supports tenant isolation, reactive updates, search, and design token synchronization.
 * 
 * @param {Object} props
 * @param {string|number} props.value - Selected department ID
 * @param {Function} props.onChange - Callback `(selectedVal, selectedDeptObj) => void`
 * @param {Array} [props.departments] - Optional pre-loaded departments array
 * @param {string} [props.label='Department'] - Label text (or null to hide)
 * @param {string} [props.placeholder='Select Department...'] - Placeholder text
 * @param {boolean} [props.allowAll=true] - Whether to include an "All Departments" option
 * @param {string} [props.allLabel='All Departments (Institution-Wide)'] - Label for the "All" option
 * @param {string} [props.allValue=''] - Value for the "All" option
 * @param {boolean} [props.autoSelectFirst=false] - Auto select first department if none selected
 * @param {boolean} [props.optional=false] - Show optional tag
 * @param {boolean} [props.required=false] - Required indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.searchable=false] - Enable search filter
 * @param {boolean} [props.showBadge=false] - Show department code/type badge
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Selector size
 * @param {boolean} [props.compactMode=false] - Compact mode
 * @param {string} [props.error] - Error message
 * @param {React.ComponentType} [props.icon] - Leading icon (defaults to DepartmentIcon)
 * @param {Function} [props.onDepartmentsLoaded] - Callback when departments are loaded via API
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
  error,
  icon = DepartmentIcon,
  onDepartmentsLoaded,
  ...rest
}) {
  const tenantContext = useTenant ? useTenant() : {};
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  const [internalDepartments, setInternalDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(0);

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
    const opts = [];

    if (allowAll) {
      opts.push({
        value: allValue,
        label: allLabel,
        description: 'Institution-wide department scope',
      });
    }

    effectiveDepartments.forEach((dept) => {
      const deptId = String(dept.id);
      const name = dept.name || dept.department_name || 'Department';
      const nameBn = dept.name_bn || '';
      const displayLabel = nameBn ? `${name} (${nameBn})` : name;

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
  const handleChange = (selectedVal) => {
    if (!onChange) return;
    const matchedOption = options.find((opt) => String(opt.value) === String(selectedVal));
    const matchedDeptObj = matchedOption?.raw || null;
    onChange(selectedVal, matchedDeptObj);
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
      optional={optional}
      required={required}
      placeholder={loading ? 'Loading departments...' : placeholder}
      options={options}
      value={value !== undefined && value !== null ? String(value) : allValue}
      onChange={handleChange}
      disabled={disabled || loading}
      searchable={searchable || options.length > 8}
      showBadge={showBadge}
      size={size}
      compactMode={compactMode}
      error={error}
      icon={icon}
      {...rest}
    />
  );
}
