import { useState, useCallback } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useRoleTranslation } from './useRoleTranslation';
import { RoleRecord, RoleFormData } from '../types';

export function useRoleActions(onRefresh?: () => void) {
  const { showToast } = useToast();
  const { t } = useRoleTranslation();
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Helper for resilient candidate API paths
  const apiCallCandidate = async (candidatePaths: string[], options: RequestInit = {}) => {
    let lastError: Error | null = null;
    let lastRes: Response | null = null;

    for (const path of candidatePaths) {
      try {
        const res = await fetchWithAuth(path, options);
        if (res.ok) return res;
        lastRes = res;
        if (res.status >= 400 && res.status < 500) {
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (lastRes) {
      let errorMsg = `Server Error (${lastRes.status})`;
      try {
        const errData = await lastRes.json();
        if (errData) {
          if (typeof errData === 'string') {
            errorMsg = errData;
          } else if (errData.error) {
            errorMsg = errData.error;
          } else if (errData.detail) {
            errorMsg = errData.detail;
          } else {
            const msgs = Object.entries(errData)
              .map(([key, val]) => {
                const text = Array.isArray(val) ? val.join(' ') : String(val);
                return `${key !== 'detail' && key !== 'error' ? key + ': ' : ''}${text}`;
              })
              .join(' | ');
            if (msgs) errorMsg = msgs;
          }
        }
      } catch {
        // Ignore json parse error
      }
      throw new Error(errorMsg);
    }

    throw lastError || new Error('Failed to reach API endpoint');
  };

  // 1. Create Role
  const createRole = useCallback(
    async (formData: RoleFormData): Promise<boolean> => {
      setSubmitting(true);
      try {
        const paths = ['/api/v1/roles/', '/api/roles/', '/roles/'];
        await apiCallCandidate(paths, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        showToast(
          t('toasts.roleCreated', 'Role "{{name}}" created successfully!', { name: formData.name }),
          'success'
        );
        onRefresh?.();
        return true;
      } catch (err: any) {
        showToast(err.message || 'Error creating role', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t, onRefresh]
  );

  // 2. Update Role
  const updateRole = useCallback(
    async (roleId: number, formData: RoleFormData): Promise<boolean> => {
      setSubmitting(true);
      try {
        const paths = [
          `/api/v1/roles/${roleId}/`,
          `/api/roles/${roleId}/`,
          `/roles/${roleId}/`,
        ];
        await apiCallCandidate(paths, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        showToast(
          t('toasts.roleUpdated', 'Role "{{name}}" updated successfully!', { name: formData.name }),
          'success'
        );
        onRefresh?.();
        return true;
      } catch (err: any) {
        showToast(err.message || 'Error updating role', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t, onRefresh]
  );

  // 3. Clone Role
  const cloneRole = useCallback(
    async (role: RoleRecord): Promise<boolean> => {
      setSubmitting(true);
      try {
        const paths = [
          `/api/v1/roles/${role.id}/clone/`,
          `/api/roles/${role.id}/clone/`,
          `/roles/${role.id}/clone/`,
        ];
        const res = await apiCallCandidate(paths, { method: 'POST' });
        const cloned = await res.json();

        showToast(
          t('toasts.roleCloned', 'Role cloned as "{{name}}" successfully!', {
            name: cloned.name || `${role.name} (Copy)`,
          }),
          'success'
        );
        onRefresh?.();
        return true;
      } catch (err: any) {
        showToast(err.message || 'Error cloning role', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t, onRefresh]
  );

  // 4. Delete Role
  const deleteRole = useCallback(
    async (role: RoleRecord): Promise<boolean> => {
      if (role.code === 'SUPER_ADMIN') {
        showToast(
          t('toasts.cannotDeleteSystem', 'Super Admin protected role cannot be deleted.'),
          'warning'
        );
        return false;
      }

      if ((role.user_count || 0) > 0) {
        showToast(
          t('toasts.cannotDeleteAssigned', 'Cannot delete role assigned to active users.'),
          'warning'
        );
        return false;
      }

      setSubmitting(true);
      try {
        const paths = [
          `/api/v1/roles/${role.id}/`,
          `/api/roles/${role.id}/`,
          `/roles/${role.id}/`,
        ];
        await apiCallCandidate(paths, { method: 'DELETE' });

        showToast(
          t('toasts.roleDeleted', 'Role "{{name}}" deleted successfully!', { name: role.name }),
          'success'
        );
        onRefresh?.();
        return true;
      } catch (err: any) {
        showToast(err.message || 'Error deleting role', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t, onRefresh]
  );

  // 5. Set Google Default Role
  const setGoogleDefault = useCallback(
    async (role: RoleRecord): Promise<boolean> => {
      setSubmitting(true);
      try {
        const paths = [
          '/api/v1/admin/roles/set-google-default/',
          '/api/admin/roles/set-google-default/',
        ];
        await apiCallCandidate(paths, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_code: role.code }),
        });

        showToast(
          t('toasts.googleDefaultUpdated', 'Default Google role updated to "{{name}}".', {
            name: role.name,
          }),
          'success'
        );
        onRefresh?.();
        return true;
      } catch (err: any) {
        showToast(err.message || 'Failed to update Google default role', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t, onRefresh]
  );

  // 6. Export CSV
  const exportRolesCsv = useCallback(
    (rolesToExport: RoleRecord[]) => {
      try {
        const headers = ['ID', 'Name', 'Code', 'Hierarchy Level', 'Users', 'Protected', 'Description'];
        const rows = rolesToExport.map((r) => [
          r.id,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          r.code,
          r.hierarchy_level,
          r.user_count || 0,
          r.code === 'SUPER_ADMIN' ? 'YES' : 'NO',
          `"${(r.description || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `roles_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(t('toasts.exportSuccess', 'Roles exported successfully.'), 'success');
      } catch (err: any) {
        showToast(err.message || 'Export failed', 'error');
      }
    },
    [showToast, t]
  );

  return {
    submitting,
    createRole,
    updateRole,
    cloneRole,
    deleteRole,
    setGoogleDefault,
    exportRolesCsv,
  };
}

export default useRoleActions;
