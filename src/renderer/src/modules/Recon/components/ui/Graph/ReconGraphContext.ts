import { createContext } from 'react';
import type { ReconTab } from '../types';

export interface ReconGraphContextValue {
  /** Toàn bộ tab của task, dùng để Graph tự dựng đồ thị từ header và field:value. */
  tabs: ReconTab[];
  /** Tên (không đuôi) của tab đang xem, dùng cho scope=tab. */
  activeTab?: string;
}

export const ReconGraphContext = createContext<ReconGraphContextValue>({ tabs: [] });