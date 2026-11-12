/**
 * SPR Note — Staff Management Module Central Barrel
 */

export * from './types';
export * from './locales';
export * from './hooks';
export * from './roster';
export * from './onboarding';

export { default as TeacherStaffRosterView } from './roster/TeacherStaffRosterView';
export { default as StaffOnboardingView } from './onboarding/StaffOnboardingView';
export { default as StaffOnboardingWizard } from './onboarding/StaffOnboardingWizard';
export { default as PublicStaffOnboardingView } from './onboarding/PublicStaffOnboardingView';

