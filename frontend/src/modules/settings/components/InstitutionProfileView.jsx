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

export default function InstitutionProfileView() {
  const { showToast } = useToast();
  const { currentInstitution, refreshInstitutions } = useTenant();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState('slip'); // 'slip' | 'id_card' | 'report_banner'

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

      {/* 3. Large, Full-Width Live Document Preview Hub (At the Bottom) */}
      <div className="p-6 rounded-3xl theme-bg-elevated border theme-border shadow-md space-y-6">
        {/* Preview Hub Header & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div>
            <div className="flex items-center gap-2">
              <GlobeIcon className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold theme-text-primary uppercase tracking-wider">
                Live Document & Identity Preview
              </h2>
            </div>
            <p className="text-xs theme-text-secondary mt-0.5">
              Real-time interactive rendering of how admission slips, student ID badges, and report headers appear with your branding
            </p>
          </div>

          <div className="flex items-center p-1 rounded-2xl theme-bg-sub border theme-border">
            <button
              type="button"
              onClick={() => setPreviewTab('slip')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'slip'
                  ? 'theme-bg-elevated theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <BookOpenIcon className="w-3.5 h-3.5" />
              <span>Admission Slip</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('id_card')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'id_card'
                  ? 'theme-bg-elevated theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Student ID Card</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('report_banner')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'report_banner'
                  ? 'theme-bg-elevated theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <ClassIcon className="w-3.5 h-3.5" />
              <span>Report Header Banner</span>
            </button>
          </div>
        </div>

        {/* Preview Canvas Area */}
        <div className="p-4 sm:p-8 rounded-2xl theme-bg-app border theme-border flex items-center justify-center min-h-[400px]">
          {previewTab === 'slip' && (
            /* Large Full-Width Dual-Voucher Admission Slip Preview */
            <div className="w-full max-w-4xl bg-white text-zinc-900 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 shadow-xl p-6 sm:p-8 space-y-6 select-none font-sans">
              {/* Slip Header */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-zinc-800">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-300 flex items-center justify-center font-black text-xl text-zinc-700 overflow-hidden shrink-0 shadow-xs">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    formData.name?.charAt(0) || 'W'
                  )}
                </div>

                <div className="text-center flex-1 space-y-0.5">
                  <div className="text-xs font-serif italic text-zinc-500">Bismillahir Rahmanir Rahim</div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-900">
                    {formData.name || 'ACADEMIC INSTITUTION NAME'}
                  </h3>
                  {formData.bangla_name && (
                    <p className="text-sm font-semibold text-zinc-700">{formData.bangla_name}</p>
                  )}
                  <p className="text-[11px] text-zinc-600">
                    {formData.address || 'Campus Street Address'}, {formData.district || 'District, Bangladesh'} • Contact: {formData.phone || '01700000000'} {formData.email ? `• ${formData.email}` : ''}
                  </p>
                </div>

                <div className="text-right shrink-0 text-[10px] font-mono text-zinc-500 border border-zinc-200 rounded-xl p-2 bg-zinc-50">
                  <div>REG / EIIN: <strong>{formData.eiin_or_reg_no || '102938'}</strong></div>
                  <div>TYPE: <strong>{formData.institution_type}</strong></div>
                </div>
              </div>

              {/* Dual Copy Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Office / Institutional Copy */}
                <div className="p-4 rounded-xl border border-zinc-300 bg-zinc-50/70 space-y-3">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                      Institutional Copy
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">VOUCHER #ADM-8841</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                      <span className="text-zinc-500">Student Full Name:</span>
                      <strong className="text-zinc-900">Ahmad Abdullah</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                      <span className="text-zinc-500">Assigned Department:</span>
                      <strong className="text-zinc-900">Hifzul Quran Division</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                      <span className="text-zinc-500">Class & Section:</span>
                      <strong className="text-zinc-900">Standard Hifz — Halqa A</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Guardian Contact:</span>
                      <strong className="font-mono text-zinc-900">01800000000</strong>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-between text-[10px] text-zinc-500 border-t border-zinc-200 font-bold">
                    <span>Admission Officer</span>
                    <span>{formData.principal_name || 'Principal / Muhtamim Signature'}</span>
                  </div>
                </div>

                {/* Student / Guardian Copy */}
                <div className="p-4 rounded-xl border border-zinc-300 bg-zinc-50/70 space-y-3">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Student / Guardian Copy
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">STU-ID: 2026-0042</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                      <span className="text-zinc-500">Student Full Name:</span>
                      <strong className="text-zinc-900">Ahmad Abdullah</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                      <span className="text-zinc-500">Assigned Department:</span>
                      <strong className="text-zinc-900">Hifzul Quran Division</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                      <span className="text-zinc-500">Class & Section:</span>
                      <strong className="text-zinc-900">Standard Hifz — Halqa A</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Admission Status:</span>
                      <span className="text-emerald-700 font-bold">Verified & Enrolled</span>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-between text-[10px] text-zinc-500 border-t border-zinc-200 font-bold">
                    <span>Accounts Verified</span>
                    <span>Student / Guardian Signature</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'id_card' && (
            /* Dual Front & Back Student ID Cards Preview */
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full max-w-2xl py-4 select-none">
              {/* Front Badge */}
              <div className="w-64 h-96 rounded-3xl border border-sky-500/40 bg-gradient-to-b from-sky-950 via-zinc-900 to-zinc-950 text-white shadow-2xl p-5 flex flex-col justify-between text-center relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>

                {/* Top Header */}
                <div className="flex items-center justify-center gap-2 pb-2 border-b border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-xs overflow-hidden shrink-0">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      formData.name?.charAt(0) || 'W'
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold leading-tight truncate max-w-[170px] text-zinc-100">{formData.name || 'Institution Name'}</div>
                    <div className="text-[9px] text-sky-400 font-mono">{formData.slug || 'workspace'}</div>
                  </div>
                </div>

                {/* Photo & Name */}
                <div className="space-y-2">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-sky-400/60 mx-auto flex items-center justify-center font-bold text-sm text-zinc-400 shadow-md">
                    PHOTO
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-zinc-100">Ahmad Abdullah</h5>
                    <p className="text-[10px] text-zinc-400 font-mono">STU-2026-0042</p>
                  </div>
                </div>

                {/* Details Pill */}
                <div className="p-2.5 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 text-[10px] grid grid-cols-2 gap-1.5 text-left">
                  <div><span className="text-zinc-500">Dept:</span> Hifz</div>
                  <div><span className="text-zinc-500">Class:</span> Standard 1</div>
                  <div><span className="text-zinc-500">Blood:</span> B+</div>
                  <div><span className="text-zinc-500">Contact:</span> {formData.phone ? formData.phone.slice(0, 7) + '...' : '017...'}</div>
                </div>

                {/* Bottom Strip */}
                <div className="text-[9px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/80">
                  VALID TILL: DEC 2026
                </div>
              </div>

              {/* Back Badge */}
              <div className="w-64 h-96 rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white shadow-2xl p-5 flex flex-col justify-between text-center relative overflow-hidden">
                <div className="text-xs font-bold text-zinc-300 pb-2 border-b border-zinc-800">
                  INSTITUTIONAL TERMS
                </div>

                <div className="space-y-2 text-[10px] text-zinc-400 text-left">
                  <p>• This identity card is property of {formData.name || 'this Institution'}.</p>
                  <p>• If found, please return to: {formData.address || 'Campus Office'}, {formData.district || 'Dhaka'}.</p>
                  <p>• Helpline: <span className="text-sky-400 font-mono">{formData.phone || '01700000000'}</span></p>
                </div>

                <div className="py-2 border-y border-zinc-800">
                  <div className="w-32 h-6 bg-zinc-800 mx-auto rounded flex items-center justify-center font-mono text-[9px] tracking-widest text-zinc-400">
                    ||||| ||| |||||||
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] text-zinc-400 font-serif italic mb-0.5">{formData.principal_name || 'Principal Signature'}</div>
                  <div className="text-[9px] font-bold text-zinc-500 uppercase">Authorized Signature</div>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'report_banner' && (
            /* Academic Report Header Banner Preview */
            <div className="w-full max-w-3xl rounded-2xl theme-bg-elevated border theme-border shadow-xl p-6 space-y-4 select-none">
              <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xl overflow-hidden shadow-xs">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      formData.name?.charAt(0) || 'W'
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-black theme-text-primary leading-tight">
                      {formData.name || 'Academic Institution Title'}
                    </h4>
                    {formData.bangla_name && (
                      <p className="text-xs theme-text-secondary mt-0.5">{formData.bangla_name}</p>
                    )}
                    <p className="text-[10px] theme-text-secondary font-mono mt-1">
                      EIIN: {formData.eiin_or_reg_no || '102938'} • {formData.district || 'Dhaka'} • {formData.phone || '01700000000'}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-xl bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 shrink-0">
                  Daily Progress Card
                </span>
              </div>

              <div className="p-3.5 rounded-xl theme-bg-sub border theme-border text-xs flex items-center justify-between text-zinc-400">
                <span>Student: <strong className="theme-text-primary">Ahmad Abdullah</strong> (Class 1)</span>
                <span>Session: <strong className="theme-text-primary">Morning / Subah</strong></span>
                <span>Evaluation Score: <strong className="text-emerald-400">95 / 100</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
