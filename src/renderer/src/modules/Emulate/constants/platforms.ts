/**
 * Cấu hình nền tảng (platform) — nguồn dữ liệu duy nhất.
 *
 * Mỗi platform có:
 * - id:   mã định danh (vd: "web")
 * - label: tên hiển thị (vd: "Website")
 * - icon:  Lucide icon component
 * - color: tên màu Tailwind, dùng để sinh class text/bg/border trong UI
 *   Cách dùng: text-{color}-400, bg-{color}-500/15, border-{color}-500/20
 * - description: mô tả ngắn
 * - placeholder: gợi ý khi nhập URL/path
 *
 * Type AppPlatform được suy ra từ keyof typeof PLATFORMS.
 * Duyệt danh sách platform qua Object.keys(PLATFORMS).
 */
import { Globe, Monitor, Smartphone, Terminal } from 'lucide-react';

export const PLATFORMS = {
  web: {
    id: 'web',
    label: 'Website',
    icon: Globe,
    color: 'sky',
    description: 'Web application or website',
    placeholder: 'https://example.com',
  },
  pc: {
    id: 'pc',
    label: 'PC App',
    icon: Monitor,
    color: 'violet',
    description: 'Desktop application',
    placeholder: '/path/to/app',
  },
  android: {
    id: 'android',
    label: 'Mobile',
    icon: Smartphone,
    color: 'emerald',
    description: 'Android mobile app',
    placeholder: 'com.example.app',
  },
  cli: {
    id: 'cli',
    label: 'CLI',
    icon: Terminal,
    color: 'amber',
    description: 'Command-line interface tool',
    placeholder: 'command --arg',
  },
} as const;

export type AppPlatform = keyof typeof PLATFORMS;