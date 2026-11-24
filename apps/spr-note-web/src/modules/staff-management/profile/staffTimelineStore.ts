import type { StaffMember } from '@/types/staff';
import {
  lifecycleTimelineStore,
  LIFECYCLE_TIMELINE_UPDATE_EVENT,
  type LifecycleTimelineRecord,
} from '@/components/common/timeline';

export type StaffTimelineRecord = LifecycleTimelineRecord;
export const STAFF_TIMELINE_UPDATE_EVENT = LIFECYCLE_TIMELINE_UPDATE_EVENT;

export const staffTimelineStore = {
  getTimeline(tenantId: string | null | undefined, staff: StaffMember): StaffTimelineRecord[] {
    const staffId = staff?.id;
    if (!staffId) return [];

    const initialJoiningDate =
      staff.joining_date || (staff as any).created_at || new Date().toISOString().split('T')[0];
    const initialRecord: StaffTimelineRecord = {
      id: `appointment_${staffId}`,
      date: typeof initialJoiningDate === 'string' ? initialJoiningDate.split('T')[0] : '2026-01-01',
      badge: 'Official Appointment',
      title: `Appointed as ${staff.designation || 'Staff Member'}`,
      subtitle: staff.department_name || 'Academic Institution',
      description: `Officially appointed to ${staff.department_name || 'Academic Institution'} on ${initialJoiningDate}.`,
      iconKey: 'appointment',
      created_at: new Date().toISOString(),
    };

    return lifecycleTimelineStore.getTimeline(tenantId, 'staff', staffId, initialRecord);
  },

  addEvent(
    tenantId: string | null | undefined,
    staffId: string | number,
    event: Omit<StaffTimelineRecord, 'id' | 'created_at'>
  ): StaffTimelineRecord {
    return lifecycleTimelineStore.addEvent(tenantId, 'staff', staffId, event);
  },

  updateEvent(
    tenantId: string | null | undefined,
    staffId: string | number,
    eventId: string,
    updates: Partial<Omit<StaffTimelineRecord, 'id' | 'created_at'>>
  ): void {
    lifecycleTimelineStore.updateEvent(tenantId, 'staff', staffId, eventId, updates);
  },

  deleteEvent(tenantId: string | null | undefined, staffId: string | number, eventId: string): void {
    lifecycleTimelineStore.deleteEvent(tenantId, 'staff', staffId, eventId);
  },
};
