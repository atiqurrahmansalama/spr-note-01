import { createModuleTranslation } from '../../../../i18n';
import { userManagementLocales } from '../locales';

/**
 * Enterprise Scoped Translation Hook for User Management
 * Powered by colocated module locales in `frontend/src/modules/admin/user-management/locales/`
 */
export const useUserTranslation = createModuleTranslation(
  'userManagement',
  userManagementLocales
);

export default useUserTranslation;
