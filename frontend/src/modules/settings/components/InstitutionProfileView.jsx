import React, { useState, useEffect } from 'react';
import {
  DepartmentIcon,
  CheckCircleIcon,
  UploadIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EditIcon,
  SaveIcon,
  GlobeIcon,
  BookOpenIcon,
  UsersIcon,
  ClassIcon,
} from '../../../components/ui/Icons';
import { getCurrentInstitution, updateCurrentInstitution } from '../../../api/institutions';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import DocumentStudioEngine from '../../../components/documents/DocumentStudioEngine';

export default function InstitutionProfileView() {
  const { showToast } = useToast();
  const { currentInstitution, refreshInstitutions } = useTenant();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState('id_card'); // 'id_card' | 'slip' | 'certificate' | 'report_banner'

  const [formData, setFormData] = useState({
    name: '',
    bangla_name: '',
    slug: '',
    institution_type: 'MADRASA',
    eiin_or_reg_no: '',
    logo_url: '',
    phone: '',
    email: '',
    address: '',
    district: '',
    principal_name: 'Maulana Principal / Muhtamim',
  });

  useEffect(() => {
    async function fetchDetails() {
      try {
        setIsLoading(true);
        const data = await getCurrentInstitution();
        if (data) {
          setFormData({
            name: data.name || '',
            bangla_name: data.bangla_name || '',
            slug: data.slug || '',
            institution_type: data.institution_type || 'MADRASA',
            eiin_or_reg_no: data.eiin_or_reg_no || '',
            logo_url: data.logo_url || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            district: data.district || '',
            principal_name: data.principal_name || 'Principal / Muhtamim',
          });
        }
      } catch (err) {
        console.error('[InstitutionProfileView] Error fetching data:', err);
        if (currentInstitution) {
          setFormData((prev) => ({
            ...prev,
            name: currentInstitution.name || '',
            bangla_name: currentInstitution.bangla_name || '',
            slug: currentInstitution.slug || '',
            institution_type: currentInstitution.institution_type || 'MADRASA',
            eiin_or_reg_no: currentInstitution.eiin_or_reg_no || '',
            logo_url: currentInstitution.logo_url || '',
            phone: currentInstitution.phone || '',
            email: currentInstitution.email || '',
            address: currentInstitution.address || '',
            district: currentInstitution.district || '',
          }));
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [currentInstitution]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setIsSaving(true);
      await updateCurrentInstitution(formData);
      showToast('Institution profile and branding updated successfully!', 'success');
      refreshInstitutions();
    } catch (err) {
      console.error('[InstitutionProfileView] Save error:', err);
      showToast(err.response?.data?.error || 'Failed to update institution profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center theme-text-secondary flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium">Loading institutional profile & branding...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xs">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
              Institution Profile & Branding Hub
            </h1>
            <p className="text-xs theme-text-secondary mt-0.5">
              Customize campus identity, logo monogram, official signatory, and print templates
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-sky-500/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4" />
              <span>Save Branding</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Top Form Section (Branding, Contacts, Signatory) */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Identity & Monogram */}
          <div className="p-5 rounded-2xl theme-bg-elevated border theme-border shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b theme-border">
              <DepartmentIcon className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold theme-text-primary uppercase tracking-wider">
                Institutional Identity & Logo Monogram
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl theme-bg-app border theme-border">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-lg text-zinc-300 shrink-0 overflow-hidden shadow-inner">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  formData.name?.charAt(0).toUpperCase() || 'W'
                )}
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Logo / Monogram Image URL
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[10px] theme-text-secondary mt-1">
                  Appears in high-resolution across admission vouchers, student ID cards, and report headers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Official Institution Name (English) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Darul Uloom Islamic Academy"
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Native / Regional Script Name
                </label>
                <input
                  type="text"
                  value={formData.bangla_name}
                  onChange={(e) => handleInputChange('bangla_name', e.target.value)}
                  placeholder="e.g. Local or native script title"
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Institution Type
                </label>
                <select
                  value={formData.institution_type}
                  onChange={(e) => handleInputChange('institution_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                >
                  <option value="MADRASA">Madrasa / Maktab</option>
                  <option value="SCHOOL">General School</option>
                  <option value="COLLEGE">College</option>
                  <option value="COACHING">Coaching</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  EIIN / Govt. Reg. No.
                </label>
                <input
                  type="text"
                  value={formData.eiin_or_reg_no}
                  onChange={(e) => handleInputChange('eiin_or_reg_no', e.target.value)}
                  placeholder="e.g. 132456"
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs font-mono theme-text-primary focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Tenant Identifier (Slug)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-sky-400 opacity-80 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Campus & Signatory */}
          <div className="p-5 rounded-2xl theme-bg-elevated border theme-border shadow-xs space-y-4 lg:col-span-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <PhoneIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold theme-text-primary uppercase tracking-wider">
                  Contact & Campus Info
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Official Phone Number *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="e.g. 01700000000"
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="e.g. info@institution.edu"
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    placeholder="e.g. Dhaka"
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="e.g. Uttara, Dhaka"
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Principal / Muhtamim Signatory Preset
                </label>
                <input
                  type="text"
                  value={formData.principal_name}
                  onChange={(e) => handleInputChange('principal_name', e.target.value)}
                  placeholder="e.g. Maulana Shamsul Haque (Principal / Muhtamim)"
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 3. Enterprise Universal Document & Smart ID Card Studio Engine */}
      <div className="space-y-4">
        {/* Preview Hub Header & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl theme-bg-elevated border theme-border shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <GlobeIcon className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold theme-text-primary uppercase tracking-wider">
                Visual Document & Smart ID Card Studio
              </h2>
            </div>
            <p className="text-xs theme-text-secondary mt-0.5">
              Live WYSIWYG visual designer, field visibility toggles, pre-printed PVC overlay mode, and custom presets
            </p>
          </div>

          <div className="flex items-center p-1 rounded-2xl theme-bg-sub border theme-border overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setPreviewTab('id_card')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                previewTab === 'id_card'
                  ? 'theme-bg-accent theme-accent-text shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Smart ID Card</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('slip')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                previewTab === 'slip'
                  ? 'theme-bg-accent theme-accent-text shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <BookOpenIcon className="w-3.5 h-3.5" />
              <span>Admission Slip</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('certificate')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                previewTab === 'certificate'
                  ? 'theme-bg-accent theme-accent-text shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>Testimonial Certificate</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('report_banner')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                previewTab === 'report_banner'
                  ? 'theme-bg-accent theme-accent-text shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <ClassIcon className="w-3.5 h-3.5" />
              <span>Report Banner</span>
            </button>
          </div>
        </div>

        {/* Embedded Interactive Document Studio */}
        <DocumentStudioEngine
          key={previewTab}
          documentType={
            previewTab === 'id_card'
              ? 'ID_CARD'
              : previewTab === 'slip'
              ? 'ADMISSION_SLIP'
              : previewTab === 'certificate'
              ? 'TESTIMONIAL_CERTIFICATE'
              : 'REPORT_BANNER'
          }
          embeddedMode={true}
        />
      </div>
    </div>
  );
}
