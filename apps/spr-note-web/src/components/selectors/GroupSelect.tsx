import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { GroupIcon } from '../ui/Icons';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';

export interface GroupItem {
  id: string | number;
  name: string;
  student_class?: any;
  student_class_id?: string | number;
  student_class_name?: string;
  class_name?: string;
  section?: any;
  section_id?: string | number;
  [key: string]: any;
}

export interface GroupSelectProps {
  value?: string | number;
  onChange: (value: string, selectedObj?: GroupItem | null) => void;
  classId?: string | number | null;
  sectionId?: string | number | null;
  groups?: GroupItem[];
  label?: string;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compactMode?: boolean;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onGroupsLoaded?: (groups: GroupItem[]) => void;
  [key: string]: any;
}

/**
 * Enterprise Reusable Group Selector Component
 * 
 * Automatically loads groups if not provided via props, supports optional class & section filtering,
 * tenant isolation, custom formatting, "All Groups" mode, search, and design token integration.
 */
export default function GroupSelect({
  value,
  onChange,
  classId,
  sectionId,
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
  icon = GroupIcon,
  onGroupsLoaded,
  ...rest
}: GroupSelectProps) {
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  const [internalGroups, setInternalGroups] = useState<GroupItem[]>([]);
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
        if (classId && classId !== 'ALL') {
          queryParams.set('student_class', String(classId));
        }
        if (sectionId && sectionId !== 'ALL') {
          queryParams.set('section', String(sectionId));
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
  }, [propGroups, classId, sectionId, activeTenantId, onGroupsLoaded]);

  const allGroups = propGroups && Array.isArray(propGroups) ? propGroups : internalGroups;

  // Filter by classId / sectionId if supplied (and not already filtered by API)
  const filteredGroups = useMemo(() => {
    let list = allGroups;
    if (classId && classId !== 'ALL') {
      list = list.filter((g) => {
        const gClassId = g.student_class_id || g.student_class || g.class_id || (typeof g.class === 'object' ? g.class?.id : g.class);
        return !gClassId || String(gClassId) === String(classId);
      });
    }
    if (sectionId && sectionId !== 'ALL') {
      list = list.filter((g) => {
        const gSecId = g.section_id || g.section;
        return !gSecId || String(gSecId) === String(sectionId);
      });
    }
    return list;
  }, [allGroups, classId, sectionId]);

  // Format options for CustomSelect
  const options = useMemo(() => {
    const list: Array<{ value: string; label: string; typeLabel?: string; badge?: string; raw?: GroupItem | null }> = [];
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

  const handleChange = (selectedVal: string) => {
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
