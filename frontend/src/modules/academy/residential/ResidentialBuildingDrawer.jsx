import React, { useState, useEffect } from 'react';
import CustomInput from '../../../components/ui/CustomInput';
import BranchSelect from '../../../components/selectors/BranchSelect';
import TeacherSelect from '../../../components/selectors/TeacherSelect';
import { BuildingOfficeIcon, SaveIcon } from '../../../components/ui/Icons';
import { residentialStore } from '../../../utils/stores/residentialStore';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';

export default function ResidentialBuildingDrawer({
  building,
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    branch: 'MAIN_CAMPUS',
    total_floors: 3,
    warden: null,
    warden_name: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (building) {
      setFormData({
        name: building.name || '',
        code: building.code || '',
        branch: building.branch || 'MAIN_CAMPUS',
        total_floors: building.total_floors || 1,
        warden: building.warden || null,
        warden_name: building.warden_name || '',
        description: building.description || '',
      });
    }
  }, [building]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Building name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      residentialStore.saveBuilding(activeTenantId, {
        ...(building?.id ? { id: building.id } : {}),
        ...formData,
        total_floors: Number(formData.total_floors) || 1,
      });

      showToast(building?.id ? 'Residential building updated' : 'Residential building created', 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast('Failed to save building', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
      <div>
        <CustomInput
          label="Building / Block Name"
          placeholder="e.g. Main Residential Hall"
          value={formData.name}
          onChange={(val) => setFormData((prev) => ({ ...prev, name: val }))}
          required={true}
          icon={BuildingOfficeIcon}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <CustomInput
            label="Building Code"
            placeholder="e.g. MRH-01"
            value={formData.code}
            onChange={(val) => setFormData((prev) => ({ ...prev, code: val }))}
          />
        </div>

        <div>
          <CustomInput
            label="Total Floor Count"
            type="number"
            min={1}
            max={30}
            value={formData.total_floors}
            onChange={(val) => setFormData((prev) => ({ ...prev, total_floors: val }))}
            required={true}
          />
        </div>
      </div>

      <div>
        <BranchSelect
          label="Campus / Branch"
          value={formData.branch}
          onChange={(val) => setFormData((prev) => ({ ...prev, branch: val }))}
          required={true}
        />
      </div>

      <div>
        <TeacherSelect
          label="Floor Warden / In-Charge Staff"
          placeholder="Select In-Charge Staff..."
          value={formData.warden}
          onChange={(val, teacherObj) => {
            setFormData((prev) => ({
              ...prev,
              warden: val,
              warden_name: teacherObj?.name || teacherObj?.label || '',
            }));
          }}
          searchable={true}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold theme-text-secondary mb-1">
          Description & Facilities Note
        </label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional notes regarding this residential block..."
          className="w-full px-3 py-2 text-xs rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
        />
      </div>

      <div className="pt-4 border-t theme-border flex items-center justify-end gap-2.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-xl border theme-border theme-text-secondary hover:theme-bg-sub transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <SaveIcon className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : building?.id ? 'Update Building' : 'Create Building'}</span>
        </button>
      </div>
    </form>
  );
}
