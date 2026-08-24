import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';

/**
 * Enterprise Reusable Group / Halqa Selector Component
 * 
 * Automatically loads groups if not provided via props, supports optional class filtering (via classId),
 * tenant isolation, custom formatting, "All Groups" mode, search, and design token integration.
 * 
 * @param {Object} props
 * @param {string|number} props.value - Selected group ID
 * @param {Function} props.onChange - Callback `(selectedVal, selectedGroupObj) => void`
 * @param {string|number} [props.classId] - Optional class ID to filter groups
 * @param {Array} [props.groups] - Optional pre-loaded groups array
 * @param {string} [props.label='Select Group'] - Label text
 * @param {string} [props.placeholder='Select Group...'] - Placeholder text
 * @param {boolean} [props.allowAll=true] - Whether to include an "All Groups" option
 * @param {string} [props.allLabel='All Groups'] - Label for the "All Groups" option
 * @param {boolean} [props.required=false] - Required indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.searchable=true] - Enable search filter
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Selector size
 * @param {boolean} [props.compactMode=false] - Compact mode
 * @param {string} [props.error] - Error message
 * @param {React.ComponentType} [props.icon] - Optional leading icon
 * @param {Function} [props.onGroupsLoaded] - Callback when groups are loaded via API
 */
export default function GroupSelect({
  value,
  onChange,
  classId,
  groups: propGroups,
  label = 'Select Group',
  placeholder = 'Select Group...',
  allowAll = true,
  allLabel = 'All Groups',
  required = false,
  disabled = false,
  searchable = true,
  showBadge = false,
  size = 'md',
  compactMode = false,
  error,
  icon,
  onGroupsLoaded,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [internalGroups, setInternalGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch groups if propGroups is not supplied
  useEffect(() => {
    if (propGroups && Array.isArray(propGroups)) {
      setInternalGroups(propGroups);
      return;
    }

    let isMounted = true;
    const loadGroups = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ page_size: '500' });
        if (classId) {
          queryParams.set('student_class', classId);
        }
        const res = await fetchWithAuth(`/api/v1/groups/?${queryParams.toString()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalGroups(list);
          if (onGroupsLoaded) {
            onGroupsLoaded(list);
          }
        }
      } catch (err) {
        console.warn('GroupSelect: Failed to load groups:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadGroups();
    return () => {
      isMounted = false;
    };
  }, [propGroups, classId, activeTenantId]);

  const allGroups = propGroups && Array.isArray(propGroups) ? propGroups : internalGroups;

  // Filter by classId if supplied (and not already filtered by API)
  const filteredGroups = useMemo(() => {
    if (!classId) return allGroups;
    return allGroups.filter((g) => {
      const gClassId = g.student_class_id || g.student_class || g.class_id || (typeof g.class === 'object' ? g.class?.id : g.class);
      return !gClassId || String(gClassId) === String(classId);
    });
  }, [allGroups, classId]);

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

    filteredGroups.forEach((g) => {
      const classNameStr = g.student_class_name || g.class_name;
      list.push({
        value: String(g.id),
        label: classNameStr && !classId ? `${g.name} (${classNameStr})` : g.name,
        typeLabel: showBadge ? (classNameStr || 'Group') : undefined,
        badge: showBadge ? (classNameStr || 'Group') : undefined,
        raw: g,
      });
    });

    return list;
  }, [filteredGroups, allowAll, allLabel, classId, showBadge]);

  const handleChange = (selectedVal) => {
    const foundObj = filteredGroups.find((g) => String(g.id) === String(selectedVal)) || null;
    onChange(selectedVal, foundObj);
  };

  return (
    <CustomSelect
      value={value !== undefined && value !== null ? String(value) : ''}
      onChange={handleChange}
      options={options}
      label={label}
      placeholder={loading ? 'Loading groups...' : placeholder}
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
