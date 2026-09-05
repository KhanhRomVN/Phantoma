import { create } from 'zustand'
import { PhantomModule } from '../types/phantom-module'

interface ActiveModuleState {
  activeModule: PhantomModule
  setActiveModule: (module: PhantomModule) => void
}

// Store dùng chung cho toàn bộ renderer — mọi component gọi useActiveModule
// đều đọc/ghi cùng một state, tránh tình trạng mỗi component có state riêng.
export const useActiveModuleStore = create<ActiveModuleState>()((set) => ({
  activeModule: 'recon',
  setActiveModule: (module) => set({ activeModule: module }),
}))

export function useActiveModule(initial: PhantomModule = 'recon') {
  const activeModule = useActiveModuleStore((s) => s.activeModule)
  const setActiveModule = useActiveModuleStore((s) => s.setActiveModule)
  // ASSUMED: initial giữ lại để tương thích signature cũ; store dùng chung đã có default 'recon'
  void initial
  return { activeModule, setActiveModule }
}