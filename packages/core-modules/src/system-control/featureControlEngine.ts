/**
 * Feature Control Resolution Engine
 * =================================
 * Resolves effective feature flag states considering tenant-specific overrides.
 */

import { FeatureFlagDefinition, TenantFeatureOverride } from './types';

export function isFeatureActive(
  featureKey: string,
  overrides: Record<string, boolean> = {},
  definitions: FeatureFlagDefinition[] = []
): boolean {
  if (overrides[featureKey] !== undefined) {
    return Boolean(overrides[featureKey]);
  }

  const def = definitions.find((d) => d.key === featureKey);
  return def ? def.defaultValue : false;
}

export function compileTenantOverridesMap(
  overridesList: TenantFeatureOverride[] = []
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const item of overridesList) {
    if (item && item.featureKey) {
      map[item.featureKey] = item.isEnabled;
    }
  }
  return map;
}
