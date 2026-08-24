import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';

/**
 * Enterprise Reusable Class Selector Component
 * 
 * Automatically loads classes if not supplied via props.
 * Supports tenant isolation, custom formatting, "All Classes" mode, search,
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
 * @param {boolean} [props.autoSelectFirst=false] - Auto select first class if none selected & allowAll is false
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
  label = 'Select Class',
  placeholder = 'Select Class...',
  allowAll = true,
  allLabel = 'All Classes',
  autoSelectFirst = false,
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

  // Fetch classes if propClasses is not supplied
  useEffect(() => {
    if (propClasses && Array.isArray(propClasses)) {
      setInternalClasses(propClasses);
      return;
    }

    let isMounted = true;
    const loadClasses = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/v1/classes/');
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

  const activeClasses = propClasses && Array.isArray(propClasses) ? propClasses : internalClasses;

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
        value: '',
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
  }, [activeClasses, allowAll, allLabel, showBadge]);

  const handleChange = (selectedVal) => {
    const foundObj = activeClasses.find((c) => String(c.id) === String(selectedVal)) || null;
    onChange(selectedVal, foundObj);
  };

  return (
    <CustomSelect
      value={value !== undefined && value !== null ? String(value) : ''}
      onChange={handleChange}
      options={options}
      label={label}
      placeholder={loading ? 'Loading classes...' : placeholder}
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
