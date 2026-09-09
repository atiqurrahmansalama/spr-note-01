/**
 * Tenant and Institution Domain Type Definitions
 * Enterprise Multi-Tenant Hierarchy Architecture
 */

export interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  isMainBranch?: boolean;
  institutionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicInstitution {
  id: string;
  name: string;
  code: string;
  slug?: string;
  subdomain?: string;
  logoUrl?: string;
  bannerUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  establishedYear?: number;
  branches?: Branch[];
  currentSessionId?: string;
  currentSessionName?: string;
  subscriptionPlan?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  subscriptionStatus?: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED';
  maxStudentCapacity?: number;
  featuresEnabled?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantTaxonomySetting {
  id: string;
  institutionId: string;
  classLabel?: string;
  sectionLabel?: string;
  departmentLabel?: string;
  groupLabel?: string;
  sessionLabel?: string;
  rollNumberLabel?: string;
  updatedAt?: string;
}

export interface TenantContextState {
  activeTenantId: string | null;
  institution: AcademicInstitution | null;
  branches: Branch[];
  activeBranchId: string | null;
  isLoading: boolean;
  error: string | null;
}
