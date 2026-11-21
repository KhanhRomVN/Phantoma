/**
 * Lưu thiết bị mobile đang được Connect (từ menu chuột phải của
 * mobile card). Log viewer đọc serial này để bắt logcat.
 */

import { create } from 'zustand';
import { runtimeApi } from '@renderer/modules/Emulate/shared/api/runtime.api';

interface MobileConnectionState {
  serial: string | null;
  name: string | null;
  connect: (serial: string, name: string) => void;
  disconnect: () => void;
}

export const useMobileConnectionStore = create<MobileConnectionState>((set) => ({
  serial: null,
  name: null,
  connect: (serial, name) => {
    set({ serial, name });
    void runtimeApi.mobileProvision(serial);
  },
  disconnect: () => set({ serial: null, name: null }),
}));