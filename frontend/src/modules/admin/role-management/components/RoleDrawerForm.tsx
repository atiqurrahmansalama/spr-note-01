import React, { useState, useMemo } from 'react';
import { useToast } from '../../../../context/ToastContext';
import { useRoleTranslation } from '../hooks/useRoleTranslation';
import {
  KeyIcon,
  SaveIcon,
} from '../../../../components/ui/Icons';
import CustomInput from '../../../../components/ui/CustomInput';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';
import { useRoleActions } from '../hooks/useRoleActions';
import { RoleRecord, RoleFormData, ActionPermissions } from '../types';

export interface RoleDrawerFormProps {
  role?: RoleRecord | null;
  mode?: 'add' | 'edit';
  existingRoles?: RoleRecord[];
  onSaved?: () => void;
  onCancel?: () => void;
}

export const RoleDrawerForm: React.FC<RoleDrawerFormProps> = ({
  role = null,
  mode = 'add',
  existingRoles = [],
  onSaved,
  onCancel,
}) => {
  const { showToast } = useToast();
  const { t } = useRoleTranslation();
  const isEditing = mode === 'edit' && Boolean(role);
  const isSuperAdmin = isEditing && role?.code === 'SUPER_ADMIN';

  const { submitting, createRole, updateRole } = useRoleActions(onSaved);

  const initialPermissions: ActionPermissions = useMemo(() => {
    return {
      can_create_student: role?.action_permissions?.can_create_student ?? true,
      can_edit_student: role?.action_permissions?.can_edit_student ?? true,
      can_delete_report: role?.action_permissions?.can_delete_report ?? false,
      can_export_reports: role?.action_permissions?.can_export_reports ?? true,
      can_manage_users: role?.action_permissions?.can_manage_users ?? false,
    };
  }, [role]);

  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || '',
    code: role?.code || '',
    description: role?.description || '',
    hierarchy_level: role?.hierarchy_level ?? 5,
    color_theme: role?.color_theme || 'blue',
    action_permissions: initialPermissions,
  });

  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const next: RoleFormData = { ...prev, name: val };
      if (!isEditing) {
        next.code = val
          .toUpperCase()
          .trim()
          .replace(/[^A-Z0-9]/g, '_')
          .replace(/_+/g, '_');
      }
      return next;
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast(t('toasts.validationError', 'Please fill in all required fields.'), 'warning');
      return;
    }
    if (!formData.code.trim()) {
      showToast(t('toasts.validationError', 'Please fill in all required fields.'), 'warning');
      return;
    }

    // Unique code check
    const targetCode = formData.code.trim().toUpperCase();
    const duplicate = existingRoles.find(
      (r) => r.code.toUpperCase() === targetCode && r.id !== role?.id
    );
    if (duplicate) {
      showToast(
        t('toasts.codeExists', 'Role code "{{code}}" already exists. Please choose a unique code.', {
          code: targetCode,
        }),
        'warning'
      );
      return;
    }

    let ok = false;
    if (isEditing && role) {
      ok = await updateRole(role.id, formData);
    } else {
      ok = await createRole(formData);
    }

    if (ok) {
      onSaved?.();
    }
  };


  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <DrawerContainer padding="none" spacing="normal">
        <div className="@container space-y-6 pt-2 text-left">
          <DrawerSection
            title={t('drawers.basicInfoSection', 'Basic Information')}
            icon={KeyIcon}
          >
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <CustomInput
                label={t('fields.name', 'Role Display Name')}
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('fields.namePlaceholder', 'e.g. Senior Ustadh')}
              />

              <CustomInput
                label={t('fields.code', 'Role Unique Code')}
                required
                disabled={isSuperAdmin}
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
                  })
                }
                placeholder={t('fields.codePlaceholder', 'e.g. SENIOR_USTADH')}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium theme-text-secondary">
                {t('fields.description', 'Role Description')}
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('fields.descriptionPlaceholder', 'Briefly describe the operational scope for this role...')}
                className="w-full theme-bg-surface border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:theme-border resize-none transition-colors"
              />
            </div>
          </DrawerSection>

        </div>
      </DrawerContainer>

      <DrawerFooter
        onCancel={onCancel}
        cancelText="Discard"
        confirmText={
          submitting
            ? 'Saving...'
            : isEditing
            ? 'Save Changes'
            : 'Create Role'
        }
        confirmIcon={SaveIcon}
        confirmDisabled={submitting}
        confirmLoading={submitting}
      />
    </form>
  );
};

export default RoleDrawerForm;
