import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';
import { SectionIcon } from '../ui/Icons';

export interface SectionItem {
  id: string | number;
  section_name: string;
  name?: string;
  student_class?: any;
  student_class_id?: string | number;
  student_class_name?: string;
  section_type?: string;
  room_number?: string;
  class_teacher_name?: string;
  branch?: string | number;
  branch_id?: string | number;
  [key: string]: any;
}

export interface SectionSelectProps {
  value?: string | number;
  onChange: (value: string, selectedObj?: SectionItem | null) => void;
  classId?: string | number | null;
  branchId?: string | number | null;
  sections?: SectionItem[];
  label?: string;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string;
  optional?: boolean;
  optionalLabel?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compactMode?: boolean;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSectionsLoaded?: (sections: SectionItem[]) => void;
  [key: string]: any;
}

/**
 * Universal Reusable Section Selector Component
 * 
 * Automatically loads class sections if not supplied via props.
 * Supports filtering by parent classId, branch, search, optional direct-class level option,
 * and seamless theme token integration.
 */
export default function SectionSelect({
  value,
  onChange,
  classId,
  branchId,
  sections: propSections,
  label = 'Class Section',
  placeholder = 'Select Section...',
  allowAll = false,
  allLabel = 'All Sections',
  allValue = 'ALL',
  optional = false,
  optionalLabel = 'No Section (Direct Class Level)',
  required = false,
  disabled = false,
  searchable = false,
  size = 'md',
  compactMode = false,
  error,
  icon = SectionIcon,
  onSectionsLoaded,
  ...rest
}: SectionSelectProps) {
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  const [internalSections, setInternalSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch sections if propSections is not supplied
  useEffect(() => {
    if (propSections && Array.isArray(propSections)) {
      setInternalSections(propSections);
      return;
    }

    let isMounted = true;
    const loadSections = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (classId && classId !== 'ALL') query.append('class', String(classId));
        if (branchId && branchId !== 'ALL') query.append('branch', String(branchId));
        const qs = query.toString() ? `?${query.toString()}` : '';

        const res = await fetchWithAuth(`/api/v1/academy/sections/${qs}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalSections(list);
          if (onSectionsLoaded) {
            onSectionsLoaded(list);
          }
        }
      } catch (err) {
        console.warn('SectionSelect: Failed to load sections:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSections();

    return () => {
      isMounted = false;
    };
  }, [propSections, classId, branchId, activeTenantId, onSectionsLoaded]);

  // Filter sections dynamically if pre-loaded array was provided with classId
  const filteredSections = useMemo(() => {
    let list = Array.isArray(internalSections) ? internalSections : [];
    if (classId && classId !== 'ALL') {
      list = list.filter((s) => {
        const rawClass = s.student_class !== undefined
          ? s.student_class
          : (s.student_class_id || s.class_id || s.classId || s.class);
        const secClassId = rawClass
          ? (typeof rawClass === 'object' ? String(rawClass.id || '') : String(rawClass))
          : (s.classId ? String(s.classId) : '');
        return secClassId === String(classId) || !secClassId;
      });
    }
    if (branchId && branchId !== 'ALL') {
      list = list.filter((s) => String(s.branch) === String(branchId) || String(s.branch_id) === String(branchId));
    }
    return list;
  }, [internalSections, classId, branchId]);

  // Construct options for CustomSelect
  const options = useMemo(() => {
    const opts: Array<{ label: string; value: string; description?: string; raw?: SectionItem | null }> = [];

    if (allowAll) {
      opts.push({
        label: allLabel,
        value: allValue !== undefined ? allValue : 'ALL',
        description: 'View all sections',
      });
    }

    if (optional) {
      opts.push({
        label: optionalLabel,
        value: '',
        description: 'Direct enrollment without specific section',
      });
    }

    filteredSections.forEach((s) => {
      const sectionId = String(s.id !== undefined && s.id !== null ? s.id : s.value ?? '');
      // Prevent duplicate 'All Sections' if already present in passed array
      if (allowAll && (sectionId === 'ALL' || sectionId === '' || sectionId === allValue)) {
        return;
      }

      const sectionName = s.section_name || s.name || s.sectionName || s.label || 'Section';
      const className = s.student_class_name ? ` (${s.student_class_name})` : '';
      const roomInfo = s.room_number ? ` • Room: ${s.room_number}` : '';
      const teacherInfo = s.class_teacher_name ? ` • In-Charge: ${s.class_teacher_name}` : '';

      opts.push({
        label: `${sectionName}${className}`,
        value: sectionId,
        description: `${s.section_type || 'General'}${roomInfo}${teacherInfo}`,
        raw: s,
      });
    });

    return opts;
  }, [filteredSections, allowAll, allLabel, allValue, optional, optionalLabel]);

  const handleChange = (selectedVal: string) => {
    if (!onChange) return;
    const selectedObj = filteredSections.find((s) => {
      const sId = String(s.id !== undefined && s.id !== null ? s.id : s.value ?? '');
      return sId === String(selectedVal);
    }) || null;
    onChange(selectedVal, selectedObj);
  };

  return (
    <CustomSelect
      label={label}
      value={value !== undefined && value !== null ? String(value) : ''}
      onChange={handleChange}
      options={options}
      placeholder={loading ? 'Loading sections...' : placeholder}
      required={required}
      disabled={disabled || loading}
      searchable={searchable}
      showBadge={false}
      size={size}
      compactMode={compactMode}
      error={error}
      icon={icon}
      {...rest}
    />
  );
}
