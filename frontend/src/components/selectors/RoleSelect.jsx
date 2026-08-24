import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../ui/CustomSelect';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';

const DEFAULT_SYSTEM_ROLES = [
  { id: 1, name: 'Super Administrator', code: 'SUPER_ADMIN', description: 'Full system access & section control' },
  { id: 2, name: 'Administrator', code: 'ADMIN', description: 'Institute admin with user & report controls' },
  { id: 3, name: 'Hifz Teacher / Ustadh', code: 'TEACHER', description: 'Evaluates daily Sabaq, Sabqi & Amukhta' },
  { id: 4, name: 'Guardian / Parent', code: 'GUARDIAN', description: 'View student progress reports & copy cards' },
];

/**
 * Reusable Enterprise Role Select Component
 *
 * @param {Object} props
 * @param {string|number} props.value - Currently selected role ID or code
 * @param {Function} props.onChange - Callback: (selectedValue, selectedRoleObj) => void
 * @param {Array} [props.roles] - Optional pre-loaded roles array
 * @param {'id'|'code'|'name'} [props.valueKey='id'] - Which property to bind to value
 * @param {string} [props.label='Select Role'] - Label text
 * @param {string} [props.placeholder='Select Role...'] - Placeholder text
 * @param {boolean} [props.allowAll=true] - Whether to include an "All Roles" option
 * @param {string} [props.allLabel='All Roles'] - Label for the "All Roles" option
 * @param {boolean} [props.required=false] - Required indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.searchable=true] - Enable search filter
 * @param {boolean} [props.showBadge=false] - Display role code badge
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Selector size
 * @param {boolean} [props.compactMode=false] - Compact mode
 * @param {string} [props.error] - Error message
 * @param {React.ComponentType} [props.icon] - Optional leading icon
 * @param {Function} [props.onRolesLoaded] - Callback when roles are loaded via API
 */
export default function RoleSelect({
  value,
  onChange,
  roles: propRoles,
  valueKey = 'id',
  label = 'Select Role',
  placeholder = 'Select Role...',
  allowAll = true,
  allLabel = 'All Roles',
  required = false,
  disabled = false,
  searchable = true,
  showBadge = false,
  size = 'md',
  compactMode = false,
  error,
  icon,
  onRolesLoaded,
  ...rest
}) {
  const { activeTenantId } = useTenant();
  const [internalRoles, setInternalRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch roles from API if propRoles is not provided
  useEffect(() => {
    if (propRoles && Array.isArray(propRoles)) {
      setInternalRoles(propRoles);
      return;
    }

    let isMounted = true;
    const loadRoles = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/v1/roles/');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          const finalRoles = list.length > 0 ? list : DEFAULT_SYSTEM_ROLES;
          setInternalRoles(finalRoles);
          if (onRolesLoaded) {
            onRolesLoaded(finalRoles);
          }
        } else if (isMounted) {
          // Fallback to local storage or defaults
          try {
            const saved = localStorage.getItem('spr_local_roles_v1');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setInternalRoles(parsed);
                return;
              }
            }
          } catch {}
          setInternalRoles(DEFAULT_SYSTEM_ROLES);
        }
      } catch (err) {
        console.warn('RoleSelect: Failed to fetch roles from API, using fallback:', err);
        if (isMounted) {
          setInternalRoles(DEFAULT_SYSTEM_ROLES);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRoles();
    return () => {
      isMounted = false;
    };
  }, [propRoles, activeTenantId]);

  const activeRoles = propRoles && Array.isArray(propRoles) ? propRoles : internalRoles;

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

    activeRoles.forEach((r) => {
      const optVal = String(r[valueKey] ?? r.id ?? r.code);
      list.push({
        value: optVal,
        label: r.name || r.code || `Role #${r.id}`,
        typeLabel: showBadge ? (r.code || 'Role') : undefined,
        badge: showBadge ? (r.code || 'Role') : undefined,
        raw: r,
      });
    });

    return list;
  }, [activeRoles, allowAll, allLabel, valueKey, showBadge]);

  const handleChange = (selectedVal) => {
    const foundObj =
      activeRoles.find((r) => String(r[valueKey] ?? r.id ?? r.code) === String(selectedVal)) || null;
    onChange(selectedVal, foundObj);
  };

  return (
    <CustomSelect
      value={value !== undefined && value !== null ? String(value) : ''}
      onChange={handleChange}
      options={options}
      label={label}
      placeholder={loading ? 'Loading roles...' : placeholder}
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
