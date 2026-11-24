export type TimelineEntityType = 'staff' | 'student';

export interface LifecycleTimelineRecord {
  id: string;
  date: string;
  badge?: string;
  title: string;
  subtitle?: string;
  description?: string;
  iconKey: string;
  color?: string; // Canonical Event Color ID (reused from Calendar & Events)
  created_at?: string;
  action?: string; // backwards compatibility
}
