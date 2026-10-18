import { createModuleTranslation } from '../../../../i18n';
import { sectionControlLocales } from '../locales';

/**
 * Enterprise Scoped Translation Hook for Section Control & Feature Flagging
 * Powered by colocated module locales in `frontend/src/modules/admin/section-control/locales/`
 */
export const useSectionTranslation = createModuleTranslation(
  'sectionControl',
  sectionControlLocales
);

export default useSectionTranslation;
