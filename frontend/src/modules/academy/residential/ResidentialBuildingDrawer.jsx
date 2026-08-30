import React, { useState, useEffect } from 'react';
import CustomInput from '../../../components/ui/CustomInput';
import BranchSelect from '../../../components/selectors/BranchSelect';
import TeacherSelect from '../../../components/selectors/TeacherSelect';
import { BuildingOfficeIcon } from '../../../components/ui/Icons';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../components/layout';
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
        total_floors: building.total_floors || 3,
        warden: building.warden || null,
        warden_name: building.warden_name || '',
        description: building.description || '',
      });
    }
  }, [building]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Building name is required.', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (building?.id) {
        residentialStore.updateBuilding(building.id, formData);
        showToast('Building updated successfully.', 'success');
      } else {
        residentialStore.addBuilding(activeTenantId, formData);
        showToast('Residential building created.', 'success');
      }
      onSaveSuccess?.();
    } catch (err) {
      showToast(err.message || 'Failed to save building.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-5">
        <DrawerSection title="Building Information" icon={BuildingOfficeIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Building / Hall Name"
                  required
                  value={formData.name}
                  onChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      name: val,
                      code: prev.code ? prev.code : val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
                    }));
                  }}
                  placeholder="e.g. Al-Farooq Hall, Usman Hostel"
                  icon={BuildingOfficeIcon}
                />
              </div>

              <div>
                <CustomInput
                  label="Building Code"
                  value={formData.code}
                  onChange={(val) => setFormData((prev) => ({ ...prev, code: val.toUpperCase() }))}
                  placeholder="e.g. BLD-A"
                />
              </div>

              <div>
                <CustomInput
                  label="Total Floors"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.total_floors}
                  onChange={(val) => setFormData((prev) => ({ ...prev, total_floors: Number(val) || 1 }))}
                />
              </div>

              <div className="@[480px]:col-span-2">
                <BranchSelect
                  label="Campus Branch"
                  value={formData.branch}
                  onChange={(val) => setFormData((prev) => ({ ...prev, branch: val }))}
                  tenantId={activeTenantId}
                />
              </div>

              <div className="@[480px]:col-span-2">
                <TeacherSelect
                  label="Assigned Hall Warden / In-charge"
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

              <div className="@[480px]:col-span-2">
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
            </div>
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={saving}
          isSaveDisabled={!formData.name.trim()}
          saveLabel={building?.id ? 'Update Building' : 'Create Building'}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}
