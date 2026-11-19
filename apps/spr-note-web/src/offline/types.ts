/**
 * TaleemOS / SPR Note ERP — Central Offline Data Layer Types
 * ==========================================================
 * Strict enterprise type definitions for IndexedDB storage,
 * universal outbox mutations, cached entities, drafts, and conflict management.
 */

export type SyncStatus =
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "FAILED"
  | "CONFLICT"
  | "GRACE_PERIOD";

export type MutationAction = "CREATE" | "UPDATE" | "DELETE" | "PATCH";

export type ConflictResolutionPolicy =
  | "CLIENT_WINS"
  | "SERVER_WINS"
  | "TIMESTAMP_LATEST"
  | "MANUAL_MERGE";

/**
 * Universal Outbox Mutation representing an action to be dispatched to backend
 */
export interface OutboxMutation<TPayload = any> {
  id: string;                     // UUID for this queue entry
  tenantId: string;               // Mandatory Tenant/Institution Isolation
  module: string;                 // 'daily-progress' | 'attendance' | 'exams' | 'students' | 'doclab'
  action: MutationAction;
  endpoint: string;               // REST API URL / endpoint (e.g. '/api/attendance/bulk/')
  payload: TPayload;
  idempotencyKey: string;         // Unique UUID sent in 'X-Idempotency-Key' header
  createdAt: number;              // Timestamp (Date.now())
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  lastAttemptAt?: number;
  metadata?: Record<string, any>;
}

/**
 * Generic Cached Entity wrapper in IndexedDB
 */
export interface CachedEntity<T = any> {
  id: string | number;            // Entity Primary Key
  tenantId: string;               // Mandatory Tenant Isolation
  module: string;                 // Domain Module Identifier
  data: T;                        // Entity JSON Object
  clientUpdatedAt: number;        // Epoch timestamp
  serverUpdatedAt?: number;       // Server version timestamp if available
  isDirty: boolean;               // True if local mutation hasn't been committed to cloud
  syncStatus: SyncStatus;
  etag?: string;                  // Version hash for optimistic concurrency
}

/**
 * Auto-Save and Form Draft in IndexedDB
 */
export interface DraftItem<TDraft = any> {
  id: string;                     // Draft unique key (e.g. 'admission_form_draft_12')
  tenantId: string;               // Mandatory Tenant Isolation
  module: string;                 // Module Identifier
  draftData: TDraft;
  updatedAt: number;
}

/**
 * Options for Repository operations
 */
export interface RepositoryOptions {
  tenantId?: string;
  skipOutbox?: boolean;
  idempotencyKey?: string;
  endpoint?: string;
  conflictPolicy?: ConflictResolutionPolicy;
}

/**
 * Sync Result summary from Background Sync Worker
 */
export interface SyncExecutionResult {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  remainingCount: number;
  errors: Array<{
    id: string;
    module: string;
    reason: string;
    status?: number;
  }>;
}
