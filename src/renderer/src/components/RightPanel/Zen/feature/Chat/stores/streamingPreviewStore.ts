/**
 * ------------------------------------------------------------------
 * Streaming Preview Store
 * ------------------------------------------------------------------
 * Store cho streaming preview — bypass React render cascade.
 * Được update trực tiếp từ SSE event handler (tần suất cao) mà không
 * trigger re-render ở parent components.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { create } from 'zustand';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface StreamingPreviewStore {
  content: string;
  isStreaming: boolean;
  startTime: number | null;

  setContent: (content: string) => void;
  startStreaming: () => void;
  stopStreaming: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useStreamingPreviewStore = create<StreamingPreviewStore>((set) => ({
  content: '',
  isStreaming: false,
  startTime: null,

  setContent: (content) => set({ content }),

  startStreaming: () =>
    set({
      isStreaming: true,
      startTime: Date.now(),
      content: '',
    }),

  stopStreaming: () =>
    set({
      isStreaming: false,
      startTime: null,
      content: '',
    }),
}));

/**
 * Non-reactive API for external updates (from SSE handler).
 * Không trigger subscribers — dùng cho high-frequency updates.
 */
export const streamingPreviewStore = {
  setContent: (content: string) => {
    useStreamingPreviewStore.setState({ content });
  },

  startStreaming: () => {
    useStreamingPreviewStore.setState({
      isStreaming: true,
      startTime: Date.now(),
      content: '',
    });
  },

  stopStreaming: () => {
    useStreamingPreviewStore.setState({
      isStreaming: false,
      startTime: null,
      content: '',
    });
  },
};