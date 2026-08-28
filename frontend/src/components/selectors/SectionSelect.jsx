import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';
import { SectionIcon } from '../ui/Icons';

/**
 * Universal Reusable Section Selector Component
 * 
 * Automatically loads class sections if not supplied via props.
 * Supports filtering by parent classId, branch, search, optional direct-class level option,
 * and seamless theme token integration.
 * 
 * @param {Object} props
 * @param {string|number} props.value - Selected section ID
 * @param {Function} props.onChange - Callback `(selectedVal, selectedSectionObj) => void`
 * @param {string|number} [props.classId] - Parent Class ID to filter sections
 * @param {string|number} [props.branchId] - Branch ID to filter sections
 * @param {Array} [props.sections] - Optional pre-loaded sections array
 * @param {string} [props.label='Class Section'] - Label text
 * @param {string} [props.placeholder='Select Section...'] - Placeholder text
 * @param {boolean} [props.allowAll=false] - Include "All Sections" option
 * @param {string} [props.allLabel='All Sections'] - Label for "All Sections"
 * @param {string} [props.allValue='ALL'] - Value for "All Sections"
 * @param {boolean} [props.optional=false] - Allow empty/unassigned section option
 * @param {string} [props.optionalLabel='No Section (Direct Class Level)'] - Label for optional empty value
 * @param {boolean} [props.required=false] - Required indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.searchable=false] - Enable search filter
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Selector size
 * @param {string} [props.error] - Error message
 * @param {React.ComponentType} [props.icon] - Optional leading icon
 * @param {Function} [props.onSectionsLoaded] - Callback when sections are loaded
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
}) {
  const { activeTenantId } = useTenant();
  const [internalSections, setInternalSections] = useState([]);
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
      list = list.filter((s) => String(s.student_class) === String(classId) || String(s.student_class_id) === String(classId));
    }
    if (branchId && branchId !== 'ALL') {
      list = list.filter((s) => String(s.branch) === String(branchId) || String(s.branch_id) === String(branchId));
    }
    return list;
  }, [internalSections, classId, branchId]);

  // Construct options for CustomSelect
  const options = useMemo(() => {
    const opts = [];

    if (allowAll) {
      opts.push({
        label: allLabel,
        value: allValue,
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
      const className = s.student_class_name ? ` (${s.student_class_name})` : '';
      const roomInfo = s.room_number ? ` • Room: ${s.room_number}` : '';
      const teacherInfo = s.class_teacher_name ? ` • In-Charge: ${s.class_teacher_name}` : '';

      opts.push({
        label: `${s.section_name}${className}`,
        value: String(s.id),
        description: `${s.section_type || 'General'}${roomInfo}${teacherInfo}`,
        raw: s,
      });
    });

    return opts;
  }, [filteredSections, allowAll, allLabel, allValue, optional, optionalLabel]);

  const handleChange = (selectedVal) => {
    if (!onChange) return;
    const selectedObj = filteredSections.find((s) => String(s.id) === String(selectedVal)) || null;
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
      searchable={searchable || options.length > 8}
      size={size}
      compactMode={compactMode}
      error={error}
      icon={icon}
      optional={optional && !required}
      {...rest}
    />
  );
}
