/**
 * ------------------------------------------------------------------
 * Capture Methods Configuration
 * ------------------------------------------------------------------
 * Định nghĩa các phương pháp chặn/bắt traffic (HTTPS/HTTP) hỗ trợ cho từng nền tảng.
 * Dữ liệu này được dùng bởi frontend để render UI lựa chọn launch mode động.
 * ------------------------------------------------------------------
 */

export type Platform = 'web' | 'pc' | 'android' | 'cli';

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
}

export interface SupportedMethodsResponse {
  platform: Platform;
  methods: CaptureMethodMeta[];
}

// ─── Definitions ────────────────────────────────────────────────────────

const METHODS: Record<string, CaptureMethodMeta> = {
  cdp: {
    id: 'cdp',
    label: 'CDP',
    description: 'Chrome DevTools Protocol for debugging and automation',
    icon: 'Monitor',
    color: 'sky-400',
    ratings: { dataQuality: 5, authCompat: 5, complexity: 2 },
    pros: ['Full plaintext access', 'Auth preserved', 'Standard browser integration'],
    cons: ['Browser-specific', 'Requires remote debugging enabled'],
    limitations: 'Only works with Chromium-based browsers.',
  },
  mitm: {
    id: 'mitm-normal',
    label: 'MITM Proxy',
    description: 'Standard MITM proxy interception for traffic analysis',
    icon: 'Shield',
    color: 'amber-400',
    ratings: { dataQuality: 5, authCompat: 2, complexity: 2 },
    pros: ['Full plaintext access', 'Headers & body visible', 'Standard tool'],
    cons: ['Breaks signature validation', 'Auth may fail', 'SSL re-encryption'],
    limitations: 'Cannot preserve auth for apps with certificate pinning.',
  },
  mitmEnv: {
    id: 'mitm-env',
    label: 'MITM + ENV Inject',
    description: 'Intercept traffic with environment variable injection',
    icon: 'Syringe',
    color: 'green-400',
    ratings: { dataQuality: 5, authCompat: 3, complexity: 3 },
    pros: ['Bypass some cert checks via env vars', 'Good for CLI tools'],
    cons: ['App specific env var support required'],
    limitations: 'Depends on target application respecting standard proxy env vars.',
  },
  frida: {
    id: 'frida',
    label: 'Frida Injection',
    description: 'Runtime SSL hook - preserves auth',
    icon: 'Syringe',
    color: 'purple-400',
    ratings: { dataQuality: 5, authCompat: 5, complexity: 3 },
    pros: ['Full plaintext access', 'Auth preserved', 'Runtime inspection'],
    cons: ['Process injection', 'May trigger anti-debug', 'App-specific'],
    limitations: 'Requires injectable process. May not work with protected apps.',
  },
  ebpf: {
    id: 'ebpf',
    label: 'eBPF Capture',
    description: 'Kernel-level SSL capture - preserves auth',
    icon: 'Zap',
    color: 'cyan-400',
    ratings: { dataQuality: 5, authCompat: 5, complexity: 4 },
    pros: ['Full plaintext access', 'Auth preserved', 'No SSL interference'],
    cons: ['Linux only', 'Requires root', 'Complex setup'],
    limitations: 'Kernel-level access required. Not available on all systems.',
  },
  pcap: {
    id: 'pcap',
    label: 'Packet Capture',
    description: 'Network-level capture - metadata only',
    icon: 'Network',
    color: 'blue-400',
    ratings: { dataQuality: 1, authCompat: 5, complexity: 1 },
    pros: ['Auth preserved', 'Simple setup', 'No app interference'],
    cons: ['Encrypted data only', 'No plaintext', 'Metadata only'],
    limitations: 'Can only capture: host, port, timing, packet sizes. No decryption.',
  },
  appDebug: {
    id: 'app-debug',
    label: 'App Debug Mode',
    description: 'Native app logging - if supported',
    icon: 'Activity',
    color: 'green-400',
    ratings: { dataQuality: 5, authCompat: 5, complexity: 1 },
    pros: ['Full plaintext access', 'Auth preserved', 'Native app logs'],
    cons: ['App must support', 'Verbose output', 'Format varies'],
    limitations: 'Only works if app has debug/verbose logging mode.',
  },
};

// ─── Platform Mapping ───────────────────────────────────────────────────

const PLATFORM_METHODS: Record<Platform, string[]> = {
  web: ['cdp', 'mitm'],
  pc: ['mitm', 'mitmEnv', 'frida'],
  android: ['mitm'], // Tạm thời chỉ MITM, Frida cần thêm logic device selection phức tạp hơn ở backend
  cli: ['ebpf'], // Tạm thời chỉ eBPF vì các method khác chưa implement — upgrade path: thêm lại key khi backend hỗ trợ
};

/**
 * Lấy danh sách phương pháp hỗ trợ cho một platform cụ thể.
 */
export function getCaptureMethodsForPlatform(platform: Platform): CaptureMethodMeta[] {
  const methodKeys = PLATFORM_METHODS[platform] || [];
  return methodKeys.map((key) => METHODS[key]).filter(Boolean);
}

export { METHODS as CAPTURE_METHOD_DEFINITIONS };