import { createModuleTranslation } from '../../../../i18n';
import { roleManagementLocales } from '../locales';

/**
 * Enterprise Scoped Translation Hook for Role Management
 * Powered by colocated module locales in `frontend/src/modules/admin/role-management/locales/`
 */
export const useRoleTranslation = createModuleTranslation(
  'roleManagement',
  roleManagementLocales
);

export default useRoleTranslation;
