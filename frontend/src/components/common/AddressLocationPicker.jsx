import React, { useState } from 'react';
import { LocationIcon, CompassIcon, CloseIcon } from '../ui/Icons';
import { formatCoordinates } from '../../services/googleMapsLoader';
import AddressMapModal from './AddressMapModal';

export default function AddressLocationPicker({
  value = '',
  onChange,
  label = 'Address',
  placeholder = 'Enter street address or pick on map...',
  disabled = false,
  required = false,
  className = '',
  showCoordinatesBadge = true,
}) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Normalize value representation (can be string or structured object)
  const isObject = typeof value === 'object' && value !== null;
  const addressText = isObject ? (value.address || value.street_address || '') : (value || '');
  const latitude = isObject ? value.latitude : null;
  const longitude = isObject ? value.longitude : null;

  const handleManualTextChange = (e) => {
    const newText = e.target.value;
    if (isObject) {
      onChange?.({
        ...value,
        address: newText,
        street_address: newText,
      });
    } else {
      onChange?.(newText);
    }
  };

  const handleMapConfirm = (selectedLocation) => {
    if (isObject) {
      onChange?.({
        ...value,
        ...selectedLocation,
      });
    } else {
      onChange?.(selectedLocation.address || selectedLocation.street_address || '');
    }
  };

  const handleClearCoords = (e) => {
    e.stopPropagation();
    if (isObject) {
      onChange?.({
        ...value,
        latitude: null,
        longitude: null,
        map_place_id: '',
      });
    }
  };

  const coordBadge = formatCoordinates(latitude, longitude);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label and Map Trigger Header */}
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-bold theme-text-secondary">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        {showCoordinatesBadge && coordBadge && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-accent-soft theme-accent">
            <CompassIcon className="w-3 h-3" />
            <span>{coordBadge}</span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClearCoords}
                className="hover:text-rose-400 p-0.5 rounded-sm transition-colors"
                title="Clear Coordinates"
              >
                <CloseIcon className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input Box with Integrated Map Action Button */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={addressText}
          onChange={handleManualTextChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full pl-3 pr-28 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary placeholder:text-neutral-500 focus:outline-none focus:border-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={() => !disabled && setIsMapOpen(true)}
          disabled={disabled}
          className="absolute right-1 top-1 bottom-1 px-2.5 rounded-lg theme-bg-elevated border theme-border text-[11px] font-bold theme-text-primary hover:theme-bg-sub transition-colors flex items-center gap-1 shadow-2xs"
          title="Pick exact location on map"
        >
          <LocationIcon className="w-3.5 h-3.5 theme-accent" />
          <span>Pick on Map</span>
        </button>
      </div>

      {/* Map Picker Modal */}
      {isMapOpen && (
        <AddressMapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          initialLocation={isObject ? value : { address: addressText }}
          onConfirm={handleMapConfirm}
        />
      )}
    </div>
  );
}
