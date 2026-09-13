import React, { useState, useEffect } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import BranchSelect from '@/components/selectors/BranchSelect';
import TeacherSelect from '@/components/selectors/TeacherSelect';
import { BuildingOfficeIcon } from '@/components/ui/Icons';
import { DrawerContainer, DrawerSection, DrawerFooter } from '@/components/layout';
import { residentialStore } from '@/stores/residentialStore';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/context/ToastContext';
import { useFormAutoSave } from '@/hooks';
import type { ResidentialBuilding } from '@/types/residential';

export interface ResidentialBuildingDrawerProps {
  building?: ResidentialBuilding | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export interface BuildingFormData {
  name: string;
  code: string;
  branch: string;
  branch_name: string;
  total_floors: number;
  warden: string | null;
  warden_name: string;
  description: string;
}

export default function ResidentialBuildingDrawer({
  building,
  onSaveSuccess,
  onCancel,
}: ResidentialBuildingDrawerProps) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<BuildingFormData>({
    name: building?.name || '',
    code: building?.code || '',
    branch: building?.branch || 'MAIN_CAMPUS',
    branch_name: building?.branch_name || 'Main Campus',
    total_floors: building?.total_floors || 3,
    warden: building?.warden || null,
    warden_name: building?.warden_name || '',
    description: building?.description || '',
  });

  // Auto-Save / Draft Persistence
  const storageKey = building?.id
    ? `res_building_edit_${building.id}`
    : `res_building_create_${activeTenantId || 'default'}`;

  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    formData,
    setFormData,
    storageKey,
    enabled: true,
  });

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (building) {
      setFormData({
        name: building.name || '',
        code: building.code || '',
        branch: building.branch || 'MAIN_CAMPUS',
        branch_name: building.branch_name || 'Main Campus',
        total_floors: building.total_floors || 3,
        warden: building.warden || null,
        warden_name: building.warden_name || '',
        description: building.description || '',
      });
    }
  }, [building]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Building name is required.', 'warning');
      return;
    }

    setSaving(true);
    try {
      residentialStore.saveBuilding(activeTenantId, {
        ...(building?.id ? { id: building.id } : {}),
        ...formData,
        total_floors: Number(formData.total_floors) || 1,
      });

      showToast(building?.id ? 'Building updated successfully.' : 'Residential building created.', 'success');
      clearDraft();
      onSaveSuccess?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to save building.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <DrawerSection title="Building Information" icon={BuildingOfficeIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Building / Hall Name"
                  required
                  value={formData.name}
                  onChange={(val: string) => {
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
                  label="Total Floors"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.total_floors}
                  onChange={(val: string | number) => setFormData((prev) => ({ ...prev, total_floors: Number(val) || 1 }))}
                />
              </div>

              <div>
                <BranchSelect
                  label="Campus Branch"
                  value={formData.branch}
                  onChange={(val: string, obj: any) =>
                    setFormData((prev) => ({
                      ...prev,
                      branch: val,
                      branch_name: obj?.label || obj?.name || 'Main Campus',
                    }))
                  }
                />
              </div>

              <div className="@[480px]:col-span-2">
                <TeacherSelect
                  label="Assigned Hall Warden / In-charge"
                  placeholder="Select In-Charge Staff..."
                  value={formData.warden}
                  onChange={(val: string, teacherObj: any) => {
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
          onSave={handleSubmit}
          isSubmitting={saving}
          isSaveDisabled={!formData.name.trim()}
          autoSaveStatus={autoSaveStatus}
          lastSavedAt={lastSavedAt}
          saveLabel={building?.id ? 'Update Building' : 'Create Building'}
        />
      </form>
    </DrawerContainer>
  );
}
