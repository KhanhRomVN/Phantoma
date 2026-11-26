/**
 * Lưu thiết bị mobile đang được Connect (từ menu chuột phải của
 * mobile card). Log viewer đọc serial này để bắt logcat.
 */

import { create } from 'zustand';

interface MobileConnectionState {
  serial: string | null;
  name: string | null;
  connect: (serial: string, name: string) => void;
  disconnect: () => void;
}

export const useMobileConnectionStore = create<MobileConnectionState>((set) => ({
  serial: null,
  name: null,
  connect: (serial, name) => set({ serial, name }),
  disconnect: () => set({ serial: null, name: null }),
}));