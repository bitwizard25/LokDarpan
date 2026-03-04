import { create } from 'zustand';

interface AppState {
    isTheaterMode: boolean;
    toggleTheaterMode: () => void;
    setTheaterMode: (value: boolean) => void;

    isAIOpen: boolean;
    toggleAIPanel: () => void;
    setAIOpen: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    isTheaterMode: false,
    toggleTheaterMode: () => set((state) => ({ isTheaterMode: !state.isTheaterMode })),
    setTheaterMode: (value) => set({ isTheaterMode: value }),

    isAIOpen: false,
    toggleAIPanel: () => set((state) => ({ isAIOpen: !state.isAIOpen })),
    setAIOpen: (value) => set({ isAIOpen: value }),
}));
