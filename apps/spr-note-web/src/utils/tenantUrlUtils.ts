/**
 * SPR Note — Canonical Multi-Tenant URL Utility
 * Single Source of Truth for generating institutional and public tenant URLs.
 */

export interface TenantLike {
  id?: string | number;
  slug?: string;
  code?: string;
  name?: string;
  [key: string]: any;
}

/**
 * Resolves a safe, URL-friendly tenant slug.
 * Priority: slug -> code (lowercase) -> id.
 */
export function getCanonicalTenantSlug(tenant?: TenantLike | null): string {
  if (!tenant) {
    try {
      const activeId = localStorage.getItem('active_tenant_id') || localStorage.getItem('spr_active_tenant_id');
      if (activeId) return String(activeId).toLowerCase();
    } catch {}
    return 'default';
  }

  if (tenant.slug && typeof tenant.slug === 'string' && tenant.slug.trim()) {
    return tenant.slug.trim().toLowerCase();
  }

  if (tenant.code && typeof tenant.code === 'string' && tenant.code.trim()) {
    return tenant.code.trim().toLowerCase();
  }

  if (tenant.id != null) {
    return String(tenant.id).toLowerCase();
  }

  if (tenant.name && typeof tenant.name === 'string') {
    return tenant.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  return 'default';
}

/**
 * Returns the base URL with tenant slug prefix:
 * e.g. https://app.sprnote.com/a/darus-salam
 */
export function getTenantBaseUrl(tenant?: TenantLike | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const slug = getCanonicalTenantSlug(tenant);
  return `${origin}/a/${slug}`;
}

/**
 * Generates public online student admission URL:
 * e.g. https://app.sprnote.com/a/darus-salam/apply?token=XYZ
 */
export function getPublicAdmissionUrl(tenant?: TenantLike | null, token?: string): string {
  const base = getTenantBaseUrl(tenant);
  const path = `${base}/apply`;
  return token ? `${path}?token=${encodeURIComponent(token)}` : path;
}

/**
 * Generates public staff application URL:
 * e.g. https://app.sprnote.com/a/darus-salam/staff-apply
 */
export function getPublicStaffApplyUrl(tenant?: TenantLike | null): string {
  const base = getTenantBaseUrl(tenant);
  return `${base}/staff-apply`;
}

/**
 * Generates public academy portal / landing URL:
 * e.g. https://app.sprnote.com/a/darus-salam/portal
 */
export function getPublicPortalUrl(tenant?: TenantLike | null): string {
  const base = getTenantBaseUrl(tenant);
  return `${base}/portal`;
}

/**
 * Generates public role invite / join URL:
 * e.g. https://app.sprnote.com/a/darus-salam/join?token=XYZ
 */
export function getPublicJoinUrl(tenant?: TenantLike | null, token?: string): string {
  const base = getTenantBaseUrl(tenant);
  const path = `${base}/join`;
  return token ? `${path}?token=${encodeURIComponent(token)}` : path;
}

/**
 * Generates public fee receipt verification URL:
 * e.g. https://app.sprnote.com/a/darus-salam/verify-receipt/REC-12345
 */
export function getPublicReceiptVerifyUrl(tenant?: TenantLike | null, receiptNumber?: string): string {
  const base = getTenantBaseUrl(tenant);
  return receiptNumber ? `${base}/verify-receipt/${encodeURIComponent(receiptNumber)}` : `${base}/verify-receipt`;
}

/**
 * Generates public hifz progress report verification URL:
 * e.g. https://app.sprnote.com/a/darus-salam/verify-report/REP-12345
 */
export function getPublicReportVerifyUrl(tenant?: TenantLike | null, reportId?: string): string {
  const base = getTenantBaseUrl(tenant);
  return reportId ? `${base}/verify-report/${encodeURIComponent(reportId)}` : `${base}/verify-report`;
}
