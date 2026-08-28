import React, { useState, useEffect } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { HomeIcon } from '../ui/Icons';
import { residentialStore } from '../../utils/stores/residentialStore';
import { useTenant } from '../../context/TenantContext';

/**
 * Universal Enterprise Dormitory Room / Quarters Selector
 */
export default function DormitoryRoomSelect({
  value,
  onChange,
  rooms: propRooms,
  buildingId,
  branchId,
  roomType,
  label = 'Dormitory Room',
  placeholder = 'Select Room / Quarters...',
  allowAll = false,
  allLabel = 'All Rooms',
  required = false,
  disabled = false,
  searchable = true,
  size = 'md',
  icon = HomeIcon,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [internalRooms, setInternalRooms] = useState([]);

  useEffect(() => {
    if (propRooms && Array.isArray(propRooms)) {
      setInternalRooms(propRooms);
      return;
    }

    const loadRooms = () => {
      const list = residentialStore.getRooms(activeTenantId);
      setInternalRooms(list || []);
    };

    loadRooms();
    window.addEventListener('spr_residential_updated', loadRooms);
    return () => window.removeEventListener('spr_residential_updated', loadRooms);
  }, [propRooms, activeTenantId]);

  let roomList = propRooms && Array.isArray(propRooms) ? propRooms : internalRooms;

  if (buildingId && buildingId !== 'ALL') {
    roomList = roomList.filter((r) => r.building === buildingId || r.building_id === buildingId);
  }
  if (branchId && branchId !== 'ALL') {
    roomList = roomList.filter((r) => r.branch === branchId || r.branch_id === branchId);
  }
  if (roomType && roomType !== 'ALL') {
    roomList = roomList.filter((r) => r.room_type === roomType);
  }

  const options = [];
  if (allowAll) {
    options.push({ value: 'ALL', label: allLabel });
  }

  roomList.forEach((r) => {
    const rId = r.id || r.room_number;
    const nameStr = r.room_name ? ` (${r.room_name})` : '';
    const bldStr = r.building_name ? ` • ${r.building_name}` : '';
    options.push({
      value: String(rId),
      label: `Room ${r.room_number}${nameStr}${bldStr}`,
      raw: r,
    });
  });

  const handleChange = (selectedVal) => {
    const selectedObj = roomList.find((r) => String(r.id || r.room_number) === String(selectedVal)) || null;
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
