import type { LifecycleTimelineRecord, TimelineEntityType } from './timelineTypes';

export const LIFECYCLE_TIMELINE_UPDATE_EVENT = 'spr_lifecycle_timeline_updated';

function getStorageKey(
  tenantId?: string | null,
  entityType: TimelineEntityType = 'staff',
  entityId?: string | number
): string {
  const safeTenant = tenantId && tenantId !== 'ALL' && tenantId !== 'null' ? tenantId : 'default';
  const safeEntity = entityId ? String(entityId) : 'unknown';
  return `spr_${entityType}_timeline_${safeTenant}_${safeEntity}`;
}

function broadcastUpdate(entityType: TimelineEntityType, entityId: string | number): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LIFECYCLE_TIMELINE_UPDATE_EVENT, {
        detail: { entityType, entityId: String(entityId) },
      })
    );
  }
}

export const lifecycleTimelineStore = {
  getTimeline(
    tenantId: string | null | undefined,
    entityType: TimelineEntityType,
    entityId: string | number,
    initialRecord?: LifecycleTimelineRecord
  ): LifecycleTimelineRecord[] {
    if (typeof window === 'undefined') return initialRecord ? [initialRecord] : [];
    if (!entityId) return initialRecord ? [initialRecord] : [];

    const key = getStorageKey(tenantId, entityType, entityId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
      }
    } catch (e) {
      console.warn(`Error reading ${entityType} timeline:`, e);
    }

    if (initialRecord) {
      const seeded = [initialRecord];
      try {
        localStorage.setItem(key, JSON.stringify(seeded));
      } catch {}
      return seeded;
    }

    return [];
  },

  addEvent(
    tenantId: string | null | undefined,
    entityType: TimelineEntityType,
    entityId: string | number,
    event: Omit<LifecycleTimelineRecord, 'id' | 'created_at'>
  ): LifecycleTimelineRecord {
    const records = this.getRecordsRaw(tenantId, entityType, entityId);
    const newRecord: LifecycleTimelineRecord = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };

    const updated = [newRecord, ...records];
    localStorage.setItem(getStorageKey(tenantId, entityType, entityId), JSON.stringify(updated));
    broadcastUpdate(entityType, entityId);
    return newRecord;
  },

  updateEvent(
    tenantId: string | null | undefined,
    entityType: TimelineEntityType,
    entityId: string | number,
    eventId: string,
    updates: Partial<Omit<LifecycleTimelineRecord, 'id' | 'created_at'>>
  ): void {
    const records = this.getRecordsRaw(tenantId, entityType, entityId);
    const updated = records.map((rec) => (rec.id === eventId ? { ...rec, ...updates } : rec));
    localStorage.setItem(getStorageKey(tenantId, entityType, entityId), JSON.stringify(updated));
    broadcastUpdate(entityType, entityId);
  },

  deleteEvent(
    tenantId: string | null | undefined,
    entityType: TimelineEntityType,
    entityId: string | number,
    eventId: string
  ): void {
    const records = this.getRecordsRaw(tenantId, entityType, entityId);
    const updated = records.filter((rec) => rec.id !== eventId);
    localStorage.setItem(getStorageKey(tenantId, entityType, entityId), JSON.stringify(updated));
    broadcastUpdate(entityType, entityId);
  },

  getRecordsRaw(
    tenantId: string | null | undefined,
    entityType: TimelineEntityType,
    entityId: string | number
  ): LifecycleTimelineRecord[] {
    try {
      const raw = localStorage.getItem(getStorageKey(tenantId, entityType, entityId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
};
