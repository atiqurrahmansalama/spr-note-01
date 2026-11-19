/**
 * TaleemOS / SPR Note ERP — Universal Outbox & Mutation Queue Manager
 * ===================================================================
 * Manages persistent offline queues, idempotency keys, exponential backoff retries,
 * and dispatch tracking for any ERP module.
 */

import { offlineDB } from "./db";
import { OutboxMutation, MutationAction, SyncStatus } from "./types";
import { getActiveTenantId } from "./tenantManager";

export interface EnqueueMutationParams<TPayload = any> {
  module: string;
  action: MutationAction;
  endpoint: string;
  payload: TPayload;
  idempotencyKey?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

/**
 * Enqueue a new mutation into the persistent outbox
 */
export async function enqueueMutation<TPayload = any>(
  params: EnqueueMutationParams<TPayload>
): Promise<OutboxMutation<TPayload>> {
  const tenantId = params.tenantId || getActiveTenantId();
  const id = crypto.randomUUID();
  const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

  const mutation: OutboxMutation<TPayload> = {
    id,
    tenantId,
    module: params.module,
    action: params.action,
    endpoint: params.endpoint,
    payload: params.payload,
    idempotencyKey,
    createdAt: Date.now(),
    status: "PENDING",
    retryCount: 0,
    metadata: params.metadata,
  };

  await offlineDB.outbox.put(mutation);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("spr_outbox_mutation_enqueued", { detail: mutation })
    );
  }

  return mutation;
}

/**
 * Retrieve all pending mutations eligible for synchronization
 */
export async function getPendingMutations(
  tenantId?: string
): Promise<OutboxMutation[]> {
  const targetTenant = tenantId || getActiveTenantId();

  return await offlineDB.outbox
    .where("tenantId")
    .equals(targetTenant)
    .filter((m) => m.status === "PENDING" || m.status === "FAILED")
    .sortBy("createdAt");
}

/**
 * Mark a mutation as actively syncing
 */
export async function markMutationSyncing(id: string): Promise<void> {
  await offlineDB.outbox.update(id, {
    status: "SYNCING",
    lastAttemptAt: Date.now(),
  });
}

/**
 * Mark a mutation as successfully committed to the cloud database
 */
export async function markMutationSynced(id: string): Promise<void> {
  await offlineDB.outbox.update(id, {
    status: "SYNCED",
    lastAttemptAt: Date.now(),
  });

  // Optionally clean up immediately or keep for audit
  await offlineDB.outbox.delete(id);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("spr_outbox_mutation_synced", { detail: { id } })
    );
  }
}

/**
 * Mark a mutation as failed with human-readable error reasons
 */
export async function markMutationFailed(
  id: string,
  errorReason: string
): Promise<void> {
  const existing = await offlineDB.outbox.get(id);
  const nextRetryCount = (existing?.retryCount || 0) + 1;

  await offlineDB.outbox.update(id, {
    status: "FAILED",
    lastError: errorReason,
    lastAttemptAt: Date.now(),
    retryCount: nextRetryCount,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("spr_outbox_mutation_failed", {
        detail: { id, errorReason, retryCount: nextRetryCount },
      })
    );
  }
}

/**
 * Get count of pending outbox mutations for badge indicators in UI
 */
export async function getOutboxPendingCount(tenantId?: string): Promise<number> {
  const targetTenant = tenantId || getActiveTenantId();
  return await offlineDB.outbox
    .where("tenantId")
    .equals(targetTenant)
    .filter((m) => m.status === "PENDING" || m.status === "FAILED" || m.status === "SYNCING")
    .count();
}
