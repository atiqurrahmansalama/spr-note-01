/**
 * TaleemOS / SPR Note ERP — Central IndexedDB Schema (Dexie.js)
 * ==============================================================
 * Fast, asynchronous client-side database providing multi-gigabyte capacity,
 * compound multi-tenant indexes, optimistic mutations, and draft management.
 */

import Dexie, { Table } from "dexie";
import { OutboxMutation, CachedEntity, DraftItem } from "./types";

export class EnterpriseAppDB extends Dexie {
  outbox!: Table<OutboxMutation, string>;
  entities!: Table<CachedEntity, [string, string, string | number]>;
  drafts!: Table<DraftItem, string>;
  metadata!: Table<{ key: string; value: any; updatedAt: number }, string>;

  constructor() {
    super("TaleemOS_EnterpriseDB");

    // Version 1 Schema Definition
    this.version(1).stores({
      outbox: "id, tenantId, module, status, createdAt, idempotencyKey",
      entities: "[tenantId+module+id], tenantId, module, isDirty, clientUpdatedAt",
      drafts: "id, [tenantId+module], updatedAt",
      metadata: "key, updatedAt",
    });

    // Version 2 Schema Definition: Add compound [tenantId+module] index for ultra-fast strict tenant isolation
    this.version(2).stores({
      entities: "[tenantId+module+id], [tenantId+module], tenantId, module, isDirty, clientUpdatedAt",
      drafts: "id, [tenantId+module], tenantId, module, updatedAt",
    });
  }
}

/**
 * Singleton database instance across the entire ERP frontend
 */
export const offlineDB = new EnterpriseAppDB();
