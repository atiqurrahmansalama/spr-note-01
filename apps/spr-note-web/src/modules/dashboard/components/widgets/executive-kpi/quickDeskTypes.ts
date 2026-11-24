export interface PinnedPageItem {
  id: string;
  path: string;
  title: string;
  category: string;
  subCategory?: string;
  color?: 'accent' | 'emerald' | 'purple' | 'amber' | 'rose' | 'sky';
  iconName?: string;
  pinnedAt: string; // ISO string
}

export interface RecentPageItem {
  path: string;
  title: string;
  category: string;
  subCategory?: string;
  iconName?: string;
  visitedAt: number; // millisecond timestamp
}

export type QuickDeskTab = 'pinned' | 'recents' | 'system';
