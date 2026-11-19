export type PreferencesSectionId = "appearance" | "datetime" | "language";

export interface PreferencesSectionItem {
  id: PreferencesSectionId | string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

