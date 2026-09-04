/**
 * ------------------------------------------------------------------
 * Timer Store
 * ------------------------------------------------------------------
 * Zustand store quản lý hiển thị timer cho các target đang chạy
 * trong module Emulate. Lưu trữ chuỗi thời gian đã chạy cho mỗi target.
 *
 * Các actions chính:
 * - updateTimer() : Cập nhật timer hiển thị cho một target
 * - clearTimer()  : Xóa timer của một target
 * - setTimers()   : Ghi đè toàn bộ timers
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Store ──
import { create } from 'zustand';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface TimerStore {
  timerDisplay: Record<string, string>;
  updateTimer: (targetId: string, display: string) => void;
  clearTimer: (targetId: string) => void;
  setTimers: (timers: Record<string, string>) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────
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