import { create } from 'zustand';
import type {
  UniverseModuleItem,
  UniverseProgress,
  UniverseSessionPayload,
  UniverseSpaceConfig,
  UserRole,
} from '../types';

interface UniverseState {
  role: UserRole | null;
  isAuthenticated: boolean;
  isUnlockedEntry: boolean;
  space: UniverseSpaceConfig | null;
  modules: UniverseModuleItem[];
  unlockedModules: Set<string>;
  discoveredClues: string[];
  collectedStars: number;
  unlockedSurprises: string[];

  hydrateFromSession: (payload: UniverseSessionPayload) => void;
  updateProgress: (progress: UniverseProgress) => void;
  resetSession: () => void;
}

export const useUniverseStore = create<UniverseState>((set) => ({
  role: null,
  isAuthenticated: false,
  isUnlockedEntry: false,
  space: null,
  modules: [],
  unlockedModules: new Set<string>(),
  discoveredClues: [],
  collectedStars: 0,
  unlockedSurprises: [],

  hydrateFromSession: (payload) =>
    set({
      role: payload.user.role,
      isAuthenticated: true,
      isUnlockedEntry: Boolean(payload.progress?.entry_unlocked),
      space: payload.space,
      modules: payload.modules || [],
      unlockedModules: new Set(payload.progress?.unlocked_modules || []),
      discoveredClues: payload.progress?.discovered_clues || [],
      collectedStars: payload.progress?.collected_stars || 0,
      unlockedSurprises: payload.progress?.unlocked_surprises || [],
    }),

  updateProgress: (progress) =>
    set({
      isUnlockedEntry: Boolean(progress.entry_unlocked),
      unlockedModules: new Set(progress.unlocked_modules || []),
      discoveredClues: progress.discovered_clues || [],
      collectedStars: progress.collected_stars || 0,
      unlockedSurprises: progress.unlocked_surprises || [],
    }),

  resetSession: () =>
    set({
      role: null,
      isAuthenticated: false,
      isUnlockedEntry: false,
      space: null,
      modules: [],
      unlockedModules: new Set<string>(),
      discoveredClues: [],
      collectedStars: 0,
      unlockedSurprises: [],
    }),
}));
