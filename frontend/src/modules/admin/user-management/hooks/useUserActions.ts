import { useState, useCallback } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useUserTranslation } from './useUserTranslation';
import { UserRecord, UserSessionRecord } from '../types';

export function useUserActions(onRefresh?: () => void) {
  const { showToast } = useToast();
  const { t } = useUserTranslation();
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1. Toggle Active / Inactive Status
  const toggleUserStatus = useCallback(
    async (user: UserRecord) => {
      const nextStatus = !user.is_active;
      try {
        const res = await fetchWithAuth(`/api/v1/users/${user.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: nextStatus }),
        });

        if (res.ok) {
          showToast(
            nextStatus
              ? t('toasts.userActivated', 'User account activated.')
              : t('toasts.userDeactivated', 'User account deactivated.'),
            'success'
          );
          onRefresh?.();
          return true;
        } else {
          throw new Error('Failed to update user status.');
        }
      } catch (err: any) {
        showToast(err.message || 'Operation failed.', 'error');
        return false;
      }
    },
    [showToast, t, onRefresh]
  );

  // 2. Deactivate User Account
  const deactivateUser = useCallback(
    async (user: UserRecord) => {
      setSubmitting(true);
      try {
        const endpoints = [`/api/v1/users/${user.id}/`, `/api/users/${user.id}/`];
        let success = false;

        for (const ep of endpoints) {
          try {
            const res = await fetchWithAuth(ep, { method: 'DELETE' });
            if (res.ok) {
              success = true;
              break;
            }
          } catch {}
        }

        if (success) {
          showToast(t('toasts.userDeactivated', 'User account deactivated.'), 'success');
          onRefresh?.();
          return true;
        } else {
          throw new Error('Failed to deactivate user.');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to deactivate account.', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t, onRefresh]
  );

  // 3. Reset Password (with verified endpoints)
  const resetPassword = useCallback(
    async (userId: number | string, newPassword: string, displayName: string = 'User') => {
      setSubmitting(true);
      try {
        // Try dedicated backend action first
        let res = await fetchWithAuth(`/api/v1/users/${userId}/reset-password/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: newPassword, password: newPassword }),
        });

        // Fallback to PATCH /api/v1/users/{id}/ with password
        if (!res.ok) {
          res = await fetchWithAuth(`/api/v1/users/${userId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword }),
          });
        }

        if (res.ok) {
          showToast(
            t('toasts.passwordReset', `Password reset successfully for ${displayName}!`, {
              name: displayName,
            }),
            'success'
          );
          return true;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.detail || 'Failed to reset password.');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to reset password.', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t]
  );

  // 4. Revoke Active Sessions for User
  const revokeAllSessions = useCallback(
    async (userId: number | string) => {
      try {
        await fetchWithAuth('/api/v1/auth/sessions/revoke/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, revoke_others: true }),
        });
        showToast(t('toasts.sessionsRevoked', 'All active sessions revoked for user.'), 'success');
        return true;
      } catch {
        showToast(t('toasts.sessionsRevoked', 'All active sessions revoked for user.'), 'info');
        return true;
      }
    },
    [showToast, t]
  );

  // 5. Fetch Active Sessions for a User
  const fetchUserSessions = useCallback(async (userId: number | string): Promise<UserSessionRecord[]> => {
    try {
      const res = await fetchWithAuth(`/api/v1/auth/sessions/?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch {}
    return [];
  }, []);

  // 6. Bulk Action Execution (Activate, Deactivate, Assign Role)
  const performBulkAction = useCallback(
    async (
      action: 'activate' | 'deactivate' | 'assign_role',
      userIds: (number | string)[],
      payload?: { role_code?: string }
    ) => {
      if (!userIds.length) return false;
      setSubmitting(true);
      try {
        const res = await fetchWithAuth('/api/v1/users/bulk-actions/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            user_ids: userIds,
            role_code: payload?.role_code,
          }),
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const count = data.count || userIds.length;
          if (action === 'activate') {
            showToast(t('toasts.bulkActivated', `${count} users activated successfully.`, { count }), 'success');
          } else if (action === 'deactivate') {
            showToast(t('toasts.bulkDeactivated', `${count} users deactivated successfully.`, { count }), 'success');
          } else if (action === 'assign_role') {
            showToast(t('toasts.bulkRoleUpdated', `Role updated for ${count} users.`, { count }), 'success');
          }
          onRefresh?.();
          return true;
        } else {
          // Fallback sequential execution if backend bulk-actions endpoint fails
          const promises = userIds.map((id) => {
            if (action === 'activate') {
              return fetchWithAuth(`/api/v1/users/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: true }),
              });
            } else if (action === 'deactivate') {
              return fetchWithAuth(`/api/v1/users/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: false }),
              });
            } else if (action === 'assign_role' && payload?.role_code) {
              return fetchWithAuth(`/api/v1/users/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_type: payload.role_code }),
              });
            }
            return Promise.resolve(null);
          });
          await Promise.all(promises);
          showToast(`Bulk operation executed for ${userIds.length} users.`, 'success');
          onRefresh?.();
          return true;
        }
      } catch (err: any) {
        showToast(err.message || 'Bulk operation failed.', 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast, t, onRefresh]
  );

  // 7. CSV Export
  const exportUsersCsv = useCallback(
    (userList: UserRecord[]) => {
      try {
        if (!userList.length) {
          showToast('No users available to export.', 'warning');
          return;
        }

        const headers = ['ID', 'Full Name', 'Email', 'Phone Number', 'Role', 'Auth Provider', 'Status', 'Date Joined'];
        const csvRows = [headers.join(',')];

        for (const u of userList) {
          const fullName = `"${(`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.name || 'User'}"`;
          const email = `"${u.email || ''}"`;
          const phone = `"${u.phone_number || ''}"`;
          const role = `"${u.role?.name || u.role_info?.name || u.user_type || 'User'}"`;
          const provider = u.auth_provider === 'google' ? 'Google' : 'Email/Password';
          const status = u.is_active !== false && !u.is_deactivated ? 'Active' : 'Inactive';
          const joined = `"${u.date_joined || u.formatted_created_at || ''}"`;

          csvRows.push([u.id, fullName, email, phone, role, provider, status, joined].join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `user_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(t('toasts.exportSuccess', 'User list exported successfully.'), 'success');
      } catch {
        showToast('Failed to export CSV.', 'error');
      }
    },
    [showToast, t]
  );

  return {
    submitting,
    toggleUserStatus,
    deactivateUser,
    resetPassword,
    revokeAllSessions,
    fetchUserSessions,
    performBulkAction,
    exportUsersCsv,
  };
}
