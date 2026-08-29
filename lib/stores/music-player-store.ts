import { create } from "zustand";

interface Song {
  id: string;
  name: string;
  duration: string | null;
  durationSeconds: number | null;
  url: string | null;
}

interface Album {
  id: string;
  name: string;
  artist: string;
  cover: string | null;
}

interface MusicPlayerState {
  // Current playback state
  currentSong: Song | null;
  currentAlbum: Album | null;
  playlist: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isExpanded: boolean;

  // Actions
  playSong: (song: Song, album: Album, playlist?: Song[]) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  closeMiniPlayer: () => void;
}

export const useMusicPlayerStore = create<MusicPlayerState>((set, get) => ({
  // Initial state
  currentSong: null,
  currentAlbum: null,
  playlist: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isExpanded: false,

  // Actions
  playSong: (song, album, playlist) => {
    set({
      currentSong: song,
      currentAlbum: album,
      playlist: playlist || [song],
      isPlaying: true,
      currentTime: 0,
    });
  },

  pauseSong: () => {
    set({ isPlaying: false });
  },

  resumeSong: () => {
    set({ isPlaying: true });
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  nextSong: () => {
    const { currentSong, playlist } = get();
    if (!currentSong || playlist.length === 0) return;

    const currentIndex = playlist.findIndex((s) => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextSong = playlist[nextIndex];

    if (nextSong) {
      set({
        currentSong: nextSong,
        isPlaying: true,
        currentTime: 0,
      });
    }
  },

  prevSong: () => {
    const { currentSong, playlist, currentTime } = get();
    if (!currentSong || playlist.length === 0) return;

    // If more than 3 seconds in, restart current song
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const currentIndex = playlist.findIndex((s) => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    const prevSong = playlist[prevIndex];

    if (prevSong) {
      set({
        currentSong: prevSong,
        isPlaying: true,
        currentTime: 0,
      });
    }
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  setDuration: (duration) => {
    set({ duration });
  },

  setVolume: (volume) => {
    set({ volume, isMuted: volume === 0 });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  toggleExpanded: () => {
    set((state) => ({ isExpanded: !state.isExpanded }));
  },

  setExpanded: (expanded) => {
    set({ isExpanded: expanded });
  },

  closeMiniPlayer: () => {
    set({
      currentSong: null,
      currentAlbum: null,
      playlist: [],
      isPlaying: false,
      currentTime: 0,
      isExpanded: false,
    });
  },
}));
