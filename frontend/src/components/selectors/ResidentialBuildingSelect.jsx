import React, { useState, useEffect } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { BuildingOfficeIcon } from '../ui/Icons';
import { residentialStore } from '../../utils/stores/residentialStore';
import { useTenant } from '../../context/TenantContext';

/**
 * Universal Enterprise Residential Building Selector
 */
export default function ResidentialBuildingSelect({
  value,
  onChange,
  buildings: propBuildings,
  branchId,
  label = 'Residential Building',
  placeholder = 'Select Building / Block...',
  allowAll = false,
  allLabel = 'All Buildings',
  required = false,
  disabled = false,
  searchable = true,
  size = 'md',
  icon = BuildingOfficeIcon,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [internalBuildings, setInternalBuildings] = useState([]);

  useEffect(() => {
    if (propBuildings && Array.isArray(propBuildings)) {
      setInternalBuildings(propBuildings);
      return;
    }

    const loadBuildings = () => {
      const list = residentialStore.getBuildings(activeTenantId);
      setInternalBuildings(list || []);
    };

    loadBuildings();
    window.addEventListener('spr_residential_updated', loadBuildings);
    return () => window.removeEventListener('spr_residential_updated', loadBuildings);
  }, [propBuildings, activeTenantId]);

  let buildingList = propBuildings && Array.isArray(propBuildings) ? propBuildings : internalBuildings;
  if (branchId && branchId !== 'ALL') {
    buildingList = buildingList.filter((b) => b.branch === branchId || b.branch_id === branchId);
  }

  const options = [];
  if (allowAll) {
    options.push({ value: 'ALL', label: allLabel });
  }

  buildingList.forEach((b) => {
    const bId = b.id || b.code;
    const codeStr = b.code ? ` (${b.code})` : '';
    options.push({
      value: String(bId),
      label: `${b.name}${codeStr}`,
      raw: b,
    });
  });

  const handleChange = (selectedVal) => {
    const selectedObj = buildingList.find((b) => String(b.id || b.code) === String(selectedVal)) || null;
    if (onChange) {
      onChange(selectedVal, selectedObj);
    }
  };

  return (
    <CustomSelect
      value={value}
      onChange={handleChange}
      options={options}
      label={label}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      searchable={searchable}
      size={size}
      icon={icon}
      {...rest}
    />
  );
}
