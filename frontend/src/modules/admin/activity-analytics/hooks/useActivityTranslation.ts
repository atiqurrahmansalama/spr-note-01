import { createModuleTranslation } from '../../../../i18n';
import { activityAnalyticsLocales } from '../locales';

/**
 * Enterprise Scoped Translation Hook for Activity Analytics
 * Powered by colocated module locales in `frontend/src/modules/admin/activity-analytics/locales/`
 */
export const useActivityTranslation = createModuleTranslation(
  'activityAnalytics',
  activityAnalyticsLocales
);

export default useActivityTranslation;
