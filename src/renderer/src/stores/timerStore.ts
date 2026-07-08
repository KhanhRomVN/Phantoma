import { create } from 'zustand';

interface TimerStore {
  timerDisplay: Record<string, string>;
  updateTimer: (targetId: string, display: string) => void;
  clearTimer: (targetId: string) => void;
  setTimers: (timers: Record<string, string>) => void;
}

export const useTimerStore = create<TimerStore>((set) => ({
  timerDisplay: {},
  updateTimer: (targetId, display) =>
    set((state) => ({
      timerDisplay: {
        ...state.timerDisplay,
        [targetId]: display,
      },
    })),
  clearTimer: (targetId) =>
    set((state) => {
      const { [targetId]: _, ...rest } = state.timerDisplay;
      return { timerDisplay: rest };
    }),
  setTimers: (timers) => set({ timerDisplay: timers }),
}));