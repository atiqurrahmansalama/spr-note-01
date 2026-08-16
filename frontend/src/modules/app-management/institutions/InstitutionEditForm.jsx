import React, { useState, useEffect } from 'react';
import { SleekCheckIcon } from '../../../components/ui/Icons';
import { updateInstitution } from '../../../api/institutions';
import { useToast } from '../../../context/ToastContext';

export default function InstitutionEditForm({ institution, onSuccess, onCancel }) {
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bangla_name: '',
    phone: '',
    district: '',
    address: '',
    email: '',
    logo_url: '',
    eiin_or_reg_no: '',
    institution_type: 'MADRASA',
  });

  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name || '',
        bangla_name: institution.bangla_name || '',
        phone: institution.phone || '',
        district: institution.district || '',
        address: institution.address || '',
        email: institution.email || '',
        logo_url: institution.logo_url || '',
        eiin_or_reg_no: institution.eiin_or_reg_no || '',
        institution_type: institution.institution_type || 'MADRASA',
      });
    }
  }, [institution]);

  if (!institution) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Institution name is required.', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      await updateInstitution(institution.id, formData);
      showToast('Institution updated successfully!', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('[Edit Institution Error]:', err);
      showToast(err.message || 'Failed to update institution', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 h-full overflow-y-auto theme-text-primary">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Name Fields */}
        <div>
          <label className="block text-xs font-bold theme-text-secondary mb-1">
            Institution Name (English) *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold theme-text-secondary mb-1">
            Native / Bengali Name
          </label>
          <input
            type="text"
            value={formData.bangla_name}
            onChange={(e) => setFormData({ ...formData, bangla_name: e.target.value })}
            className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60"
          />
        </div>

        {/* Type & EIIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold theme-text-secondary mb-1">
              Institution Type
            </label>
            <select
              value={formData.institution_type}
              onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60 cursor-pointer"
            >
              <option value="MADRASA">Madrasa / Maktab</option>
              <option value="SCHOOL">General School</option>
              <option value="COLLEGE">College / Higher Ed</option>
              <option value="COACHING">Coaching / Academy</option>
              <option value="OTHER">Other Institution</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold theme-text-secondary mb-1">
              EIIN / Govt. Reg No.
            </label>
            <input
              type="text"
              value={formData.eiin_or_reg_no}
              onChange={(e) => setFormData({ ...formData, eiin_or_reg_no: e.target.value })}
              className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60"
            />
          </div>
        </div>

        {/* Contact & District */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold theme-text-secondary mb-1">
              Official Phone
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold theme-text-secondary mb-1">
              District / Region
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60"
            />
          </div>
        </div>

        {/* Email & Logo */}
        <div>
          <label className="block text-xs font-bold theme-text-secondary mb-1">
            Official Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold theme-text-secondary mb-1">
            Logo Image URL
          </label>
          <input
            type="url"
            value={formData.logo_url}
            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-bold theme-text-secondary mb-1">
            Campus Address
          </label>
          <textarea
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 border-t theme-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUpdating}
            className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="px-4 py-1.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
          >
            <SleekCheckIcon className="w-3.5 h-3.5" />
            <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
