import React, { useState, useEffect, useRef } from 'react';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  MailIcon,
  LocationIcon,
  EditIcon,
  SaveIcon,
  CheckCircleIcon,
  CameraIcon,
  CloseIcon,
  UsersIcon,
  ClassIcon,
  StudentIcon,
  GlobeIcon,
  SparklesIcon,
  DepartmentIcon,
} from '../../../components/ui/Icons';
import { getCurrentInstitution, updateCurrentInstitution, getInstitutionCategories } from '../../../api/institutions';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import CustomSelect from '../../../components/ui/CustomSelect';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_BY_DIVISION,
  BD_GEO_DATA,
} from '../../../utils/bangladeshGeoData';

const FALLBACK_CATEGORIES = [
  { label: 'Madrasa / Maktab', value: 'MADRASA' },
  { label: 'General School', value: 'SCHOOL' },
  { label: 'College / Institute', value: 'COLLEGE' },
  { label: 'Coaching / Academy', value: 'COACHING' },
  { label: 'University / Higher Ed', value: 'UNIVERSITY' },
  { label: 'Other Educational Center', value: 'OTHER' },
];

export default function AcademyProfileView() {
  const { showToast } = useToast();
  const { currentInstitution, refreshInstitutions } = useTenant();
  const fileInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    bangla_name: '',
    slug: '',
    institution_type: 'MADRASA',
    eiin_or_reg_no: '',
    logo_url: '',
    logo_data: '',
    phone: '',
    email: '',
    address: '',
    street_address: '',
    district: '',
    division: '',
    upazila_thana: '',
    postal_code: '',
    post_code: '',
    is_verified: true,
    is_active: true,
    total_students_count: 0,
    total_classes_count: 0,
    total_staff_count: 0,
    created_at: '',
    updated_at: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [data, cats] = await Promise.allSettled([
          getCurrentInstitution(),
          getInstitutionCategories(),
        ]);

        if (cats.status === 'fulfilled' && Array.isArray(cats.value)) {
          setDynamicCategories(cats.value);
        }

        if (data.status === 'fulfilled' && data.value) {
          const instData = data.value;
          setFormData({
            name: instData.name || '',
            bangla_name: instData.bangla_name || '',
            slug: instData.slug || '',
            institution_type: instData.institution_type || 'MADRASA',
            eiin_or_reg_no: instData.eiin_or_reg_no || '',
            logo_url: instData.logo_url || instData.logo_data || '',
            logo_data: instData.logo_data || '',
            phone: instData.phone || '',
            email: instData.email || '',
            address: instData.address || '',
            street_address: instData.street_address || instData.address || '',
            district: instData.district || '',
            division: instData.division || '',
            upazila_thana: instData.upazila_thana || '',
            postal_code: instData.postal_code || instData.post_code || '',
            post_code: instData.post_code || instData.postal_code || '',
            is_verified: instData.is_verified ?? true,
            is_active: instData.is_active ?? true,
            total_students_count: instData.total_students_count || 0,
            total_classes_count: instData.total_classes_count || 0,
            total_staff_count: instData.total_staff_count || 0,
            created_at: instData.created_at || '',
            updated_at: instData.updated_at || '',
          });
        }
      } catch (err) {
        console.error('[AcademyProfileView] Error loading data:', err);
        if (currentInstitution) {
          setFormData((prev) => ({
            ...prev,
            name: currentInstitution.name || '',
            bangla_name: currentInstitution.bangla_name || '',
            slug: currentInstitution.slug || '',
            institution_type: currentInstitution.institution_type || 'MADRASA',
            eiin_or_reg_no: currentInstitution.eiin_or_reg_no || '',
            logo_url: currentInstitution.logo_url || currentInstitution.logo_data || '',
            phone: currentInstitution.phone || '',
            email: currentInstitution.email || '',
            address: currentInstitution.address || '',
            street_address: currentInstitution.street_address || currentInstitution.address || '',
            district: currentInstitution.district || '',
            division: currentInstitution.division || '',
            upazila_thana: currentInstitution.upazila_thana || '',
            postal_code: currentInstitution.postal_code || currentInstitution.post_code || '',
            is_verified: currentInstitution.is_verified ?? true,
            is_active: currentInstitution.is_active ?? true,
            created_at: currentInstitution.created_at || '',
            updated_at: currentInstitution.updated_at || '',
          }));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [currentInstitution]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo file size should be less than 2MB', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setFormData((prev) => ({
          ...prev,
          logo_url: base64,
          logo_data: base64,
        }));
        showToast('Logo selected. Click "Save Changes" to apply.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDivisionChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      division: val,
      district: '',
      upazila_thana: '',
    }));
  };

  const handleDistrictChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      district: val,
      upazila_thana: '',
    }));
  };

  const availableDistricts = BANGLADESH_DISTRICTS_BY_DIVISION[formData.division] || [];
  const availableThanas = (formData.division && formData.district && BD_GEO_DATA[formData.division]?.[formData.district]) || [];

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Institution Name is required', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        bangla_name: formData.bangla_name?.trim() || '',
        slug: formData.slug?.trim() || undefined,
        institution_type: formData.institution_type,
        eiin_or_reg_no: formData.eiin_or_reg_no?.trim() || '',
        logo_url: formData.logo_url || null,
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        address: formData.address?.trim() || '',
        street_address: formData.street_address?.trim() || formData.address?.trim() || '',
        district: formData.district || '',
        division: formData.division || '',
        upazila_thana: formData.upazila_thana || '',
        postal_code: formData.postal_code?.trim() || '',
        post_code: formData.postal_code?.trim() || '',
      };

      const updated = await updateCurrentInstitution(payload);
      showToast('Academy profile updated successfully!', 'success');
      setIsEditing(false);
      
      // Update local state with latest timestamp
      setFormData((prev) => ({
        ...prev,
        ...updated,
        updated_at: updated?.updated_at || new Date().toISOString(),
      }));

      if (refreshInstitutions) {
        refreshInstitutions();
      }
    } catch (err) {
      console.error('[AcademyProfileView] Save error:', err);
      showToast(err.message || 'Failed to update academy profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Format timestamp with user's local timezone
  const formatTimestamp = (dateStr) => {
    if (!dateStr) return new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center theme-text-secondary flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin theme-accent"></div>
        <span className="text-xs font-semibold">Loading Academy Profile...</span>
      </div>
    );
  }

  const establishedDateStr = formData.created_at
    ? new Date(formData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '2024';

  const typeLabel =
    dynamicCategories.find((t) => t.code === formData.institution_type)?.name ||
    FALLBACK_CATEGORIES.find((t) => t.value === formData.institution_type)?.label ||
    formData.institution_type ||
    'Madrasa / Maktab';

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-fade-in text-left">
      {/* Hidden File Input for Logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLogoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* --- STANDARD MODULE HEADER --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0">
            <BuildingOfficeIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              Academy Profile
            </h1>
            <p className="text-xs theme-text-secondary mt-0.5">
              Active Campus Credentials, Identity & Contact Information
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* --- STATS SUMMARY BAR --- */}
      <MetricsGrid
        items={[
          {
            label: 'Enrolled Students',
            value: formData.total_students_count ?? 0,
            icon: UsersIcon,
            color: 'accent',
          },
          {
            label: 'Academic Classes',
            value: formData.total_classes_count ?? 0,
            icon: ClassIcon,
            color: 'default',
          },
          {
            label: 'Faculty & Staff',
            value: formData.total_staff_count ?? 0,
            icon: DepartmentIcon,
            color: 'default',
          },
          {
            label: 'Operating Status',
            value: 'Active & Verified',
            icon: CheckCircleIcon,
            color: 'accent',
          },
        ]}
      />

      {/* --- DIRECT 2-COLUMN MAIN CARDS (Compact, balanced spacing) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-4.5">
        {/* ======================================================== */}
        {/* 1. LEFT CARD: Academy Identity & Academic Credentials    */}
        {/* ======================================================== */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs flex flex-col justify-between">
          {/* Top Logo & Title Block */}
          <div className="flex items-center gap-4 pb-3.5 border-b theme-border">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center font-bold text-xl theme-accent overflow-hidden shadow-xs">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span>{formData.name ? formData.name.charAt(0).toUpperCase() : 'A'}</span>
                )}
              </div>
              {/* Logo change button */}
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                title="Upload Academy Logo"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl theme-bg-accent theme-accent-text shadow-sm hover:scale-105 transition cursor-pointer border theme-border"
              >
                <CameraIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-accent">
                {typeLabel}
              </span>
              <h3 className="text-base sm:text-lg font-bold theme-text-primary truncate">
                {formData.name || 'Academy Full Name'}
              </h3>
              {formData.bangla_name && (
                <p className="text-xs theme-text-secondary truncate mt-0.5">
                  {formData.bangla_name}
                </p>
              )}
            </div>
          </div>

          {/* Field Matrix: Clean, spacious & full-width for long texts */}
          <div className="space-y-4 text-left">
            {/* Institution Name (Full Width so long names are completely visible) */}
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Institution Official Name *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Darul Uloom Islamic Academy"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                  required
                />
              ) : (
                <p className="text-xs sm:text-sm font-semibold theme-text-primary break-words">
                  {formData.name || '--'}
                </p>
              )}
            </div>

            {/* Native / Regional Name (Full Width) */}
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Native / Regional Name (Optional)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.bangla_name}
                  onChange={(e) => handleInputChange('bangla_name', e.target.value)}
                  placeholder="e.g. Local or native script title"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                />
              ) : (
                <p className="text-xs sm:text-sm font-semibold theme-text-primary break-words">
                  {formData.bangla_name || '--'}
                </p>
              )}
            </div>

            {/* 2-Column Grid for Compact Properties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t theme-border">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Institution Category / Type
                </label>
                {isEditing ? (
                  <select
                    value={formData.institution_type}
                    onChange={(e) => handleInputChange('institution_type', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                  >
                    {dynamicCategories.length > 0 ? (
                      dynamicCategories.map((t) => (
                        <option key={t.id || t.code} value={t.code}>{t.name}</option>
                      ))
                    ) : (
                      FALLBACK_CATEGORIES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))
                    )}
                  </select>
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary">
                    {typeLabel}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  EIIN / Govt. Reg Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.eiin_or_reg_no}
                    onChange={(e) => handleInputChange('eiin_or_reg_no', e.target.value)}
                    placeholder="e.g. 132456"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current font-mono"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary font-mono">
                    {formData.eiin_or_reg_no || '--'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Web Slug / Portal URL
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="e.g. darul-quran"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-accent focus:outline-none focus:border-current font-mono"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-accent font-mono">
                    {formData.slug ? `app/${formData.slug}` : '--'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Established / Reg Date
                </label>
                <p className="text-xs sm:text-sm font-semibold theme-text-primary">
                  {establishedDateStr}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. RIGHT CARD: Campus Location & Contact Information     */}
        {/* ======================================================== */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs flex flex-col justify-between">
          {/* Header */}
          <div className="pb-3 border-b theme-border">
            <h3 className="text-base sm:text-lg font-bold theme-text-primary">
              Contact & Campus Location
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Official communication lines and physical campus address
            </p>
          </div>

          {/* Field Matrix */}
          <div className="space-y-4 text-left">
            {/* Phone & Email Row (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Primary Phone *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current font-mono"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary font-mono">
                    {formData.phone || '--'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Official Email *
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="e.g. info@academy.edu"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary truncate">
                    {formData.email || '--'}
                  </p>
                )}
              </div>
            </div>

            {/* Geographic Cascading Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t theme-border">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Division
                </label>
                {isEditing ? (
                  <CustomSelect
                    value={formData.division}
                    onChange={handleDivisionChange}
                    options={BANGLADESH_DIVISIONS}
                    placeholder="Select Division"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary">
                    {formData.division || '--'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  District
                </label>
                {isEditing ? (
                  <CustomSelect
                    value={formData.district}
                    onChange={handleDistrictChange}
                    options={availableDistricts}
                    placeholder="Select District"
                    searchable
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary">
                    {formData.district || '--'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Upazila / Thana
                </label>
                {isEditing ? (
                  availableThanas.length > 0 ? (
                    <CustomSelect
                      value={formData.upazila_thana}
                      onChange={(val) => handleInputChange('upazila_thana', val)}
                      options={availableThanas}
                      placeholder="Select Thana"
                      searchable
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.upazila_thana}
                      onChange={(e) => handleInputChange('upazila_thana', e.target.value)}
                      placeholder="e.g. Mirpur"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                    />
                  )
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary">
                    {formData.upazila_thana || '--'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Postal Code
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="e.g. 1216"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current font-mono"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-semibold theme-text-primary font-mono">
                    {formData.postal_code || '--'}
                  </p>
                )}
              </div>
            </div>

            {/* Full Street Address (Full Width) */}
            <div className="pt-2 border-t theme-border">
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Campus Street Address & Holding Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g. House #12, Road #4, Sector #7, Uttara"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                />
              ) : (
                <p className="text-xs sm:text-sm font-semibold theme-text-primary break-words">
                  {formData.address || '--'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- BOTTOM FOOTER METADATA BAR --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t theme-border text-xs theme-text-secondary">
        <span className="font-mono text-[11px]">
          Last Updated: {formatTimestamp(formData.updated_at)}
        </span>
        <span className="flex items-center gap-1.5 theme-accent font-semibold text-[11px]">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          <span>Active Tenant Database Context</span>
        </span>
      </div>
    </div>
  );
}
