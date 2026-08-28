import React, { useState, useEffect } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { BuildingOfficeIcon } from '../ui/Icons';
import { getBranches } from '../../api/academy';

/**
 * Universal Enterprise Branch Selector Component
 * 
 * @param {Object} props
 * @param {string|number} props.value - Selected branch ID
 * @param {Function} props.onChange - Callback `(selectedVal, selectedBranchObj) => void`
 * @param {Array} [props.branches] - Optional pre-loaded branches array
 * @param {string} [props.label='Campus / Branch'] - Label text
 * @param {string} [props.placeholder='Select Branch...'] - Placeholder text
 * @param {boolean} [props.allowAll=false] - Whether to include an "All Branches" option
 * @param {string} [props.allLabel='All Branches'] - Label for the "All Branches" option
 * @param {boolean} [props.required=false] - Required indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.searchable=true] - Enable search filter
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Selector size
 * @param {React.ComponentType} [props.icon=BuildingOfficeIcon] - Icon
 */
export default function BranchSelect({
  value,
  onChange,
  branches: propBranches,
  label,
  placeholder = 'Select Campus / Branch...',
  allowAll = false,
  allLabel = 'All Branches',
  required = false,
  disabled = false,
  searchable = true,
  size = 'md',
  icon = BuildingOfficeIcon,
  ...rest
}) {
  const [internalBranches, setInternalBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propBranches && Array.isArray(propBranches)) {
      setInternalBranches(propBranches);
      return;
    }

    let isMounted = true;
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const res = await getBranches();
        if (res && res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setInternalBranches(list);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, [propBranches]);

  const branchList = propBranches && Array.isArray(propBranches) ? propBranches : internalBranches;

  const options = [];
  if (allowAll) {
    options.push({ value: 'ALL', label: allLabel });
  }

  branchList.forEach((b) => {
    options.push({
      value: String(b.id),
      label: b.branch_name || b.name,
      subLabel: b.branch_code ? `Code: ${b.branch_code}` : undefined,
    });
  });

  const handleChange = (selectedVal) => {
    if (onChange) {
      const selectedObj = branchList.find((b) => String(b.id) === String(selectedVal)) || null;
      onChange(selectedVal, selectedObj);
    }
  };

  return (
    <CustomSelect
      label={label}
      value={value ? String(value) : (allowAll ? 'ALL' : '')}
      onChange={handleChange}
      options={options}
      placeholder={loading ? 'Loading branches...' : placeholder}
      required={required}
      disabled={disabled || loading}
      searchable={searchable}
      size={size}
      icon={icon}
      {...rest}
    />
  );
}
