import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { CalendarIcon } from '../ui/Icons';
import { useTenant } from '../../context/TenantContext';
import { academicYearsStore } from '../../utils/localStore';

/**
 * Enterprise Reusable Semester / Academic Term Selector Component
 * 
 * Dynamically loads configured semesters and terms from Academic Years store with real-time sync.
 */
export default function SemesterSelect({
  value,
  onChange,
  academicYearId,
  label = 'Semester',
  placeholder = 'Select Semester...',
  allowAll = false,
  allLabel = 'All Semesters',
  required = false,
  disabled = false,
  searchable = true,
  size = 'md',
  compactMode = false,
  error,
  icon = CalendarIcon,
  onTermsLoaded,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    try {
      const data = academicYearsStore.getConfiguredTerms(activeTenantId, academicYearId);
      setTerms(Array.isArray(data) ? data : []);
      if (onTermsLoaded) onTermsLoaded(data);
    } catch (err) {
      console.error('[SemesterSelect] Error loading terms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId, academicYearId]);

  // Real-time sync with Academic Years & Terms changes
  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener('spr_academic_years_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('spr_academic_years_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [activeTenantId, academicYearId]);

  const options = useMemo(() => {
    const formatted = (terms || []).map((t) => ({
      value: t.name,
      label: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      raw: t,
    }));

    if (allowAll) {
      return [{ value: 'ALL', label: allLabel }, ...formatted];
    }
    return formatted;
  }, [terms, allowAll, allLabel]);

  const handleChange = (selectedVal) => {
    if (!onChange) return;
    const selectedObj = options.find((opt) => opt.value === selectedVal) || null;
    onChange(selectedVal, selectedObj);
  };

  return (
    <CustomSelect
      label={label}
      placeholder={loading ? 'Loading semesters...' : placeholder}
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
