import React, { useState, useMemo } from 'react';
import {
  LocationIcon,
  CompassIcon,
} from './Icons';
import CustomSelect from './CustomSelect';
import CustomInput from './CustomInput';
import AddressMapModal from '../common/AddressMapModal';
import {
  BANGLADESH_DIVISIONS,
  BD_GEO_DATA,
  MAJOR_THANAS_BY_DISTRICT,
  normalizeDivision,
  normalizeDistrict,
  findUpazila,
} from '../../utils/bangladeshGeoData';

/**
 * Enterprise Reusable Address & Google Maps Integration Component
 * Used across Academy Onboarding, Academic Branches, Student Admission & Profiles.
 *
 * Directly connects with project's interactive Google Maps / Leaflet system (AddressMapModal).
 */
export default function AddressPickerInput({
  value = {},
  onChange,
  title = '',
  subTitle = '',
  showMapHelper = true,
  showUpazila = true,
  showPostCode = true,
  showStreetAddress = true,
  required = false,
  disabled = false,
  className = '',
}) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Normalize incoming values
  const division = value.division || '';
  const district = value.district || '';
  const upazila = value.upazila || value.upazila_thana || value.thana_or_upazila || value.thana || '';
  const postCode = value.post_code || value.postal_code || '';
  const streetAddress = value.street_address || value.address || value.street || '';
  const latitude = value.latitude != null ? Number(value.latitude) : null;
  const longitude = value.longitude != null ? Number(value.longitude) : null;

  // 1. Division Dropdown Options
  const divisionOptions = useMemo(() => {
    let list = [...BANGLADESH_DIVISIONS];
    if (division && !list.includes(division)) {
      list.unshift(division);
    }
    return list.map((d) => ({ label: d, value: d }));
  }, [division]);

  // 2. District Dropdown Options (Cascaded by Division)
  const districtOptions = useMemo(() => {
    let districts = [];
    if (division && BD_GEO_DATA[division]) {
      districts = Object.keys(BD_GEO_DATA[division]);
    } else {
      districts = Object.keys(MAJOR_THANAS_BY_DISTRICT);
    }
    if (district && !districts.includes(district)) {
      districts = [district, ...districts];
    }
    return districts.map((dst) => ({ label: dst, value: dst }));
  }, [division, district]);

  // 3. Upazila / Thana Options (Cascaded by District)
  const upazilaOptions = useMemo(() => {
    let list = [];
    if (division && district && BD_GEO_DATA[division]?.[district]) {
      list = [...BD_GEO_DATA[division][district]];
    } else if (district && MAJOR_THANAS_BY_DISTRICT[district]) {
      list = [...MAJOR_THANAS_BY_DISTRICT[district]];
    }

    // Crucial: if upazila is set to a custom or mapped value (e.g. from Google Maps or OSM),
    // ensure it's always included in upazilaOptions so CustomSelect can display it!
    if (upazila && !list.some((u) => u.toLowerCase() === upazila.toLowerCase())) {
      list.unshift(upazila);
    }

    if (!list || list.length === 0) {
      return [];
    }

    return list.map((u) => ({ label: u, value: u }));
  }, [division, district, upazila]);

  // Update a single field
  const updateField = (key, val) => {
    if (disabled) return;
    const updated = {
      ...value,
      division,
      district,
      upazila,
      upazila_thana: upazila,
      thana_or_upazila: upazila,
      post_code: postCode,
      postal_code: postCode,
      street_address: streetAddress,
      address: streetAddress,
      latitude,
      longitude,
      [key]: val,
    };

    if (key === 'division') {
      updated.division = val;
      updated.district = '';
      updated.upazila = '';
      updated.upazila_thana = '';
      updated.thana_or_upazila = '';
    } else if (key === 'district') {
      updated.district = val;
      updated.upazila = '';
      updated.upazila_thana = '';
      updated.thana_or_upazila = '';
    } else if (key === 'upazila' || key === 'upazila_thana' || key === 'thana_or_upazila') {
      updated.upazila = val;
      updated.upazila_thana = val;
      updated.thana_or_upazila = val;
    } else if (key === 'post_code' || key === 'postal_code') {
      updated.post_code = val;
      updated.postal_code = val;
    } else if (key === 'street_address' || key === 'address') {
      updated.street_address = val;
      updated.address = val;
    }

    onChange?.(updated);
  };

  // When user picks and confirms on the interactive Google Map Modal
  const handleMapConfirm = (mapData) => {
    const rawDiv = mapData.division || division;
    const rawDist = mapData.district || district;
    const rawUpz = mapData.upazila_thana || mapData.upazila || upazila;

    const normDiv = normalizeDivision(rawDiv) || rawDiv;
    const normDist = normalizeDistrict(rawDist, normDiv) || rawDist;
    const normUpz = findUpazila(normDist, [rawUpz], mapData.address || mapData.street_address) || rawUpz;

    const postCodeVal = mapData.postal_code || mapData.post_code || postCode;
    const streetVal = mapData.street_address || mapData.address || streetAddress;

    const updated = {
      ...value,
      division: normDiv,
      district: normDist,
      upazila: normUpz,
      upazila_thana: normUpz,
      thana_or_upazila: normUpz,
      thana: normUpz,
      post_code: postCodeVal,
      postal_code: postCodeVal,
      street_address: streetVal,
      address: streetVal,
      street: streetVal,
      latitude: mapData.latitude != null ? Number(mapData.latitude) : latitude,
      longitude: mapData.longitude != null ? Number(mapData.longitude) : longitude,
      map_place_id: mapData.map_place_id || value.map_place_id || '',
    };

    onChange?.(updated);
  };

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* Header bar with Interactive Google Map button */}
      {title !== false && (
        <div className="flex items-center justify-between pb-2 border-b theme-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <LocationIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {title || 'Address & Location Details'}
              </h3>
              {subTitle && <p className="text-[11px] theme-text-secondary">{subTitle}</p>}
            </div>
          </div>

        {/* Interactive Google Map Launcher */}
        {showMapHelper && (
          <button
            type="button"
            onClick={() => setIsMapModalOpen(true)}
            disabled={disabled}
            className="px-3.5 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-bold theme-accent transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Open Google Maps to pick exact location & pin"
          >
            <CompassIcon className="w-3.5 h-3.5" />
            <span>Pick on Google Map</span>
          </button>
        )}
      </div>
      )}

      {/* Structured Address Form Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Division */}
        <div>
          <CustomSelect
            label="Division"
            required={required}
            options={divisionOptions}
            value={division}
            onChange={(val) => updateField('division', val)}
            placeholder="Select Division"
            disabled={disabled}
          />
        </div>

        {/* District */}
        <div>
          <CustomSelect
            label="District"
            required={required}
            options={districtOptions}
            value={district}
            onChange={(val) => updateField('district', val)}
            placeholder={division ? 'Select District' : 'Select Division first'}
            disabled={disabled || !division}
          />
        </div>

        {/* Upazila / Thana */}
        {showUpazila && (
          <div>
            {upazilaOptions.length > 0 ? (
              <CustomSelect
                label="Upazila / Thana"
                options={upazilaOptions}
                value={upazila}
                onChange={(val) => updateField('upazila', val)}
                placeholder={district ? 'Select Upazila / Thana' : 'Select District first'}
                disabled={disabled || !district}
              />
            ) : (
              <CustomInput
                label="Upazila / Thana"
                placeholder="e.g. Uttara, Mirpur, Sadar"
                value={upazila}
                onChange={(val) => updateField('upazila', val)}
                disabled={disabled}
              />
            )}
          </div>
        )}

        {/* Postal Code */}
        {showPostCode && (
          <div>
            <CustomInput
              label="Post Code"
              placeholder="e.g. 1230, 4000"
              value={postCode}
              onChange={(val) => updateField('post_code', val)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Street / Physical / Village Address */}
        {showStreetAddress && (
          <div className="md:col-span-2">
            <CustomInput
              type="textarea"
              label="Street / Village Address"
              required={required}
              rows={2}
              placeholder="e.g. House 14, Road 5, Sector 4, Uttara, Dhaka-1230"
              value={streetAddress}
              onChange={(val) => updateField('street_address', val)}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Integrated Google Maps & Leaflet Interactive Modal */}
      {isMapModalOpen && (
        <AddressMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          initialLocation={{
            latitude: latitude || 23.8103,
            longitude: longitude || 90.4125,
            address: streetAddress,
            district,
            division,
            upazila_thana: upazila,
            postal_code: postCode,
          }}
          onConfirm={handleMapConfirm}
        />
      )}
    </div>
  );
}
