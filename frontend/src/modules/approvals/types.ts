/**
 * SPR Note — Unified Approvals Module Domain Types
 */

export type ApprovalDomain =
  | 'ALL'
  | 'STAFF_ONBOARDING'
  | 'STUDENT_ADMISSION'
  | 'STAFF_LEAVE'
  | 'FINANCE_REQUEST'
  | 'ROLE_INVITE';

export type ApprovalStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'SCHEDULED'
  | 'REVOKED';

export interface ApprovalActionLogItem {
  id: string;
  action: string;
  from_status: string;
  to_status: string;
  notes: string;
  metadata?: Record<string, any>;
  actor?: string | number | null;
  actor_name?: string | null;
  created_at: string;
}

export interface ApprovalRequestItem {
  id: string;
  tracking_code: string;
  institution: string;
  domain: ApprovalDomain;
  source_mode: 'ADMIN_QUICK' | 'ADMIN_WIZARD' | 'PUBLIC_PORTAL' | 'SYSTEM_TRIGGER';
  form_mode: 'QUICK' | 'FULL';
  status: ApprovalStatus;
  applicant_name: string;
  email: string;
  phone_number: string;
  summary_meta: Record<string, any>;
  payload?: Record<string, any>;
  reviewer_overrides?: Record<string, any>;
  effective_date?: string | null;
  target_model?: string;
  target_object_id?: string;
  submitted_by?: string | number | null;
  submitted_by_name?: string | null;
  reviewed_by?: string | number | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string;
  admin_remarks?: string;
  action_logs?: ApprovalActionLogItem[];
  created_at: string;
  updated_at: string;
}

export interface ApprovalSummaryCounts {
  total_pending: number;
  by_domain: Record<string, number>;
}

