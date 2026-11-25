import { create } from 'zustand';
import type { AudioTrack } from '../types';

interface MusicState {
  isPlaying: boolean;
  currentTrackIndex: number;
  volume: number;
  isMuted: boolean;
  tracks: AudioTrack[];
  
  // Actions
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (v: number) => void;
  setTrack: (index: number) => void;
}

export const useMusicStore = create<MusicState>((set) => ({
  isPlaying: false,
  currentTrackIndex: 0,
  volume: 0.75,
  isMuted: false,
  tracks: [
    {
      id: '1',
      title: 'Our Universe Melodies',
      artist: 'Acoustic Serenade',
      src: '',
      associatedMemory: 'The day we first met under the stars',
    },
    {
      id: '2',
      title: 'Starlight Lullaby',
      artist: 'Piano & Ambient Winds',
      src: '',
      associatedMemory: 'Late night conversations',
    },
  ],

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  nextTrack: () =>
    set((state) => ({
      currentTrackIndex: (state.currentTrackIndex + 1) % state.tracks.length,
      isPlaying: true,
    })),
  prevTrack: () =>
    set((state) => ({
      currentTrackIndex:
        (state.currentTrackIndex - 1 + state.tracks.length) % state.tracks.length,
      isPlaying: true,
    })),
  setVolume: (v) => set({ volume: v }),
  setTrack: (index) => set({ currentTrackIndex: index, isPlaying: true }),
}));
