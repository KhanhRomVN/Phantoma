/**
 * Capture-method metadata returned to the frontend.
 */

import type { Platform } from './platform.type';

export interface CaptureMethodMeta {
  id: string;
  label: string;
  description: string;
  icon?: string; // Tên icon lucide-react hoặc custom
  color?: string; // Tailwind class fragment e.g., 'sky-400'
  ratings: {
    dataQuality: number; // 1-5
    authCompat: number; // 1-5
    complexity: number; // 1-5 (higher = more complex)
  };
  pros: string[];
  cons: string[];
  limitations: string;
  recommended?: boolean;
  tools?: string[]; // Công cụ tham khảo cho phương pháp này
  implemented?: boolean; // false = chỉ liệt kê, backend chưa hỗ trợ (mặc định true)
}

export interface SupportedMethodsResponse {
  platform: Platform;
  methods: CaptureMethodMeta[];
}
