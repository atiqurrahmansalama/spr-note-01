import { registerModuleLocales } from '@/i18n';
import { useTranslation } from '@/i18n/useTranslation';
import { approvalsEn } from './en';
import { approvalsBn } from './bn';
import { approvalsAr } from './ar';
import { approvalsUr } from './ur';

const APPROVALS_MODULE_NAMESPACE = 'approvals';

registerModuleLocales(APPROVALS_MODULE_NAMESPACE, {
  en: approvalsEn,
  bn: approvalsBn,
  ar: approvalsAr,
  ur: approvalsUr,
});

export function useApprovalsTranslation() {
  return useTranslation(APPROVALS_MODULE_NAMESPACE);
}

