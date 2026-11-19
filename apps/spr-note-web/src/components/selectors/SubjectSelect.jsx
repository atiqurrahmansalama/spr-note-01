import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { BookOpenIcon } from '../ui/Icons';
import { useTenant } from '../../context/TenantContext';
import { academicSubjectsStore } from '../../utils/localStore';

/**
 * Enterprise Reusable Academic Subject Selector Component
 * 
 * Dynamically loads subjects from academicSubjectsStore with real-time sync across
 * Developer Tools taxonomy updates, tenant isolation, and full metadata enrichment.
 */
export default function SubjectSelect({
  value,
  onChange,
  subjects: propSubjects,
  label = 'Subject',
  placeholder = 'Select Subject...',
  allowAll = false,
  allLabel = 'All Subjects',
  required = false,
  disabled = false,
  searchable = true,
  size = 'md',
  compactMode = false,
  error,
  icon = BookOpenIcon,
  onSubjectsLoaded,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [internalSubjects, setInternalSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    if (propSubjects && Array.isArray(propSubjects)) {
      setInternalSubjects(propSubjects);
      return;
    }
    setLoading(true);
    try {
      const data = academicSubjectsStore.getSubjects(activeTenantId);
      const activeOnly = Array.isArray(data) ? data.filter((s) => s.is_active !== false) : [];
      setInternalSubjects(activeOnly);
      if (onSubjectsLoaded) onSubjectsLoaded(activeOnly);
    } catch (err) {
      console.error('[SubjectSelect] Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId, propSubjects]);

  // Real-time synchronization with Developer Tools taxonomy changes
  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener('spr_academic_subjects_updated', handleUpdate);
    window.addEventListener('spr_taxonomy_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('spr_academic_subjects_updated', handleUpdate);
      window.removeEventListener('spr_taxonomy_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [activeTenantId]);

  const options = useMemo(() => {
    const formatted = (internalSubjects || []).map((s) => {
      const displayLabel = s.name_bn ? `${s.name} (${s.name_bn})` : s.name;
      return {
        value: s.name,
        label: displayLabel,
        code: s.code,
        category: s.type,
        name_bn: s.name_bn,
        description: s.description,
        raw: s,
      };
    });

    if (allowAll) {
      return [{ value: 'ALL', label: allLabel }, ...formatted];
    }
    return formatted;
  }, [internalSubjects, allowAll, allLabel]);

  const handleChange = (selectedVal) => {
    if (!onChange) return;
    const selectedObj = options.find((opt) => opt.value === selectedVal) || null;
    onChange(selectedVal, selectedObj);
  };

  return (
    <CustomSelect
      label={label}
      placeholder={loading ? 'Loading subjects...' : placeholder}
      options={options}
      value={value}
      onChange={handleChange}
      required={required}
      disabled={disabled || loading}
      searchable={searchable}
      size={size}
      compactMode={compactMode}
      error={error}
      icon={icon}
      {...rest}
    />
  );
}
