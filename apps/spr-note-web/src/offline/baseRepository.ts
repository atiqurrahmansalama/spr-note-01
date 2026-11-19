/**
 * TaleemOS / SPR Note ERP — Central Base Repository
 * ==================================================
 * Universal, reusable offline repository layer for any domain module
 * (Daily Progress, Attendance, Exam Mark Entry, Students, DocLab).
 *
 * Guarantees:
 * 1. 0ms perceived latency via IndexedDB cache reads and optimistic writes.
 * 2. Automatic enqueuing into the Universal Outbox.
 * 3. Strict tenant isolation on every single entity query and write.
 */

import { offlineDB } from "./db";
import { CachedEntity, MutationAction, RepositoryOptions, DraftItem } from "./types";
import { getActiveTenantId } from "./tenantManager";
import { enqueueMutation } from "./outboxManager";

export class BaseRepository<T extends { id?: string | number }> {
  constructor(public readonly moduleName: string) {}

  /**
   * Get single entity by primary key from local IndexedDB cache (0ms latency)
   */
  async get(id: string | number, options?: { tenantId?: string }): Promise<T | null> {
    const tenantId = options?.tenantId || getActiveTenantId();
    const cached = await offlineDB.entities.get([tenantId, this.moduleName, id]);
    return cached ? (cached.data as T) : null;
  }

  /**
   * List all cached entities for this module within the active tenant
   */
  async list(
    filter?: (item: T) => boolean,
    options?: { tenantId?: string }
  ): Promise<T[]> {
    const tenantId = options?.tenantId || getActiveTenantId();
    const records = await offlineDB.entities
      .where("[tenantId+module]")
      .equals([tenantId, this.moduleName])
      .toArray();

    const dataItems = records.map((r) => r.data as T);
    return filter ? dataItems.filter(filter) : dataItems;
  }

  /**
   * Perform an optimistic save (Create or Update).
   * 1. Instantly writes to IndexedDB entities cache.
   * 2. Automatically enqueues to the Universal Outbox Queue with UUID idempotency key.
   */
  async saveOptimistic(
    item: T,
    action: MutationAction,
    endpoint: string,
    options?: RepositoryOptions
  ): Promise<T> {
    const tenantId = options?.tenantId || getActiveTenantId();
    const itemId = item.id !== undefined && item.id !== null ? item.id : crypto.randomUUID();
    const enrichedItem = { ...item, id: itemId } as T;

    const cachedEntity: CachedEntity<T> = {
      id: itemId,
      tenantId,
      module: this.moduleName,
      data: enrichedItem,
      clientUpdatedAt: Date.now(),
      isDirty: true,
      syncStatus: "PENDING",
    };

    // 1. Commit to local IndexedDB entity cache
    await offlineDB.entities.put(cachedEntity);

    // 2. Unless explicitly skipped, queue for background server sync
    if (!options?.skipOutbox) {
      await enqueueMutation({
        module: this.moduleName,
        action,
        endpoint,
        payload: enrichedItem,
        idempotencyKey: options?.idempotencyKey,
        tenantId,
      });
    }

    return enrichedItem;
  }

  /**
   * Perform an optimistic delete.
   * 1. Instantly removes from IndexedDB entities cache.
   * 2. Enqueues a DELETE mutation into the Universal Outbox Queue.
   */
  async deleteOptimistic(
    id: string | number,
    endpoint: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const tenantId = options?.tenantId || getActiveTenantId();

    // 1. Remove from local cache
    await offlineDB.entities.delete([tenantId, this.moduleName, id]);

    // 2. Queue DELETE action
    if (!options?.skipOutbox) {
      await enqueueMutation({
        module: this.moduleName,
        action: "DELETE",
        endpoint: `${endpoint.replace(/\/$/, "")}/${id}/`,
        payload: { id },
        idempotencyKey: options?.idempotencyKey,
        tenantId,
      });
    }
  }

  /**
   * Batch hydrate cache from server API responses without enqueuing outbox mutations
   */
  async bulkHydrate(items: T[], options?: { tenantId?: string }): Promise<void> {
    const tenantId = options?.tenantId || getActiveTenantId();
    const now = Date.now();

    const entities: CachedEntity<T>[] = items.map((item) => ({
      id: item.id || crypto.randomUUID(),
      tenantId,
      module: this.moduleName,
      data: item,
      clientUpdatedAt: now,
      serverUpdatedAt: now,
      isDirty: false,
      syncStatus: "SYNCED",
    }));

    await offlineDB.entities.bulkPut(entities);
  }

  /**
   * Save an in-progress form or document draft
   */
  async saveDraft<TDraft = any>(
    draftKey: string,
    draftData: TDraft,
    options?: { tenantId?: string }
  ): Promise<void> {
    const tenantId = options?.tenantId || getActiveTenantId();
    const draft: DraftItem<TDraft> = {
      id: `${tenantId}__${this.moduleName}__${draftKey}`,
      tenantId,
      module: this.moduleName,
      draftData,
      updatedAt: Date.now(),
    };

    await offlineDB.drafts.put(draft);
  }

  /**
   * Load an in-progress draft
   */
  async getDraft<TDraft = any>(
    draftKey: string,
    options?: { tenantId?: string }
  ): Promise<TDraft | null> {
    const tenantId = options?.tenantId || getActiveTenantId();
    const draft = await offlineDB.drafts.get(`${tenantId}__${this.moduleName}__${draftKey}`);
    return draft ? (draft.draftData as TDraft) : null;
  }

  /**
   * Clear draft after successful submission
   */
  async clearDraft(draftKey: string, options?: { tenantId?: string }): Promise<void> {
    const tenantId = options?.tenantId || getActiveTenantId();
    await offlineDB.drafts.delete(`${tenantId}__${this.moduleName}__${draftKey}`);
  }
}
