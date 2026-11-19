/**
 * System Control & Feature Flags Types
 */

export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description?: string;
  defaultValue: boolean;
  category: 'CORE' | 'ACADEMIC' | 'FINANCE' | 'RESIDENTIAL' | 'COMMUNICATION' | 'SECURITY';
  isBeta?: boolean;
}

export interface TenantFeatureOverride {
  tenantId: string;
  featureKey: string;
  isEnabled: boolean;
  updatedAt: string;
}

export interface SystemStatusState {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  minSupportedAppVersion?: string;
}
