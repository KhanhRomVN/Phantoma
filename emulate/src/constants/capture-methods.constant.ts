/**
 * ------------------------------------------------------------------
 * Capture Methods Constants
 * ------------------------------------------------------------------
 * Static catalogue of the traffic-capture methods (HTTP/HTTPS) and the
 * mapping of which methods each platform supports. The frontend uses
 * this data to render the launch-mode picker dynamically.
 * ------------------------------------------------------------------
 */

import type { CaptureMethodMeta, Platform } from '../types';

// ─── Definitions ────────────────────────────────────────────────────────

export const CAPTURE_METHOD_DEFINITIONS: Record<string, CaptureMethodMeta> = {
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
  memoryAnalysis: {
    id: 'memory-analysis',
    label: 'Memory Analysis',
    description: 'Extract TLS session keys straight from process memory, even when the app has no keylog support',
    icon: 'Cpu',
    color: 'sky-400',
    ratings: { dataQuality: 5, authCompat: 5, complexity: 4 },
    pros: ['Works when the app cannot export keylog', 'TLS 1.2 / 1.3 / QUIC', 'Auth preserved'],
    cons: ['Needs ptrace / root permission', 'Key extraction is sensitive to library versions'],
    limitations: 'Requires permission to read the memory of the target process.',
    tools: ['X-Ray-TLS', 'friTap'],
    implemented: false,
  },
  dynamicInstrumentation: {
    id: 'dynamic-instrumentation',
    label: 'Dynamic Instrumentation',
    description: 'Inject JS to hook TLS functions at runtime, can bypass SSL pinning',
    icon: 'Syringe',
    color: 'purple-400',
    ratings: { dataQuality: 5, authCompat: 5, complexity: 4 },
    pros: ['Can bypass SSL pinning', 'Very flexible hooks', 'Auth preserved'],
    cons: ['Needs custom scripts', 'May be detected by anti-debug'],
    limitations: 'Requires an injectable process.',
    tools: ['Frida', 'friTap'],
    implemented: false,
  },
  ldPreload: {
    id: 'ld-preload',
    label: 'LD_PRELOAD',
    description: 'Hook SSL_write / SSL_read through a preloaded .so library',
    icon: 'Plug',
    color: 'amber-400',
    ratings: { dataQuality: 4, authCompat: 5, complexity: 3 },
    pros: ['No root required', 'Plaintext at SSL_write / SSL_read', 'Auth preserved'],
    cons: ['Dynamically linked apps only', 'Static binaries bypass the hook'],
    limitations: 'Only works with dynamically linked applications.',
    tools: ['sslhook', 'libsslkeylog.so', 'Custom hook'],
    implemented: false,
  },
  sslKeylog: {
    id: 'sslkeylogfile',
    label: 'SSLKEYLOGFILE',
    description: 'Export TLS secrets through the environment variable and decrypt the capture offline',
    icon: 'Key',
    color: 'cyan-400',
    ratings: { dataQuality: 4, authCompat: 5, complexity: 1 },
    pros: ['Simple and reliable', 'Standard tooling', 'Auth preserved'],
    cons: ['App must support keylog export', 'Needs a packet capture to decrypt'],
    limitations: 'Does not work with apps that never export a keylog.',
    tools: ['Wireshark', 'tshark', 'tcpdump'],
    implemented: false,
  },
  mitmProxy: {
    id: 'mitm-proxy',
    label: 'MITM Proxy',
    description: 'Inspect and modify requests and responses through a proxy with a trusted CA',
    icon: 'Globe',
    color: 'green-400',
    ratings: { dataQuality: 5, authCompat: 2, complexity: 2 },
    pros: ['View and edit traffic live', 'Mature tooling'],
    cons: ['Fails with certificate pinning', 'Needs CA install and proxy config'],
    limitations: 'Cannot preserve auth for apps with certificate pinning.',
    tools: ['mitmproxy', 'Burp Suite', 'PolarProxy'],
    implemented: false,
  },
};

// ─── Platform Mapping ───────────────────────────────────────────────────

export const PLATFORM_CAPTURE_METHODS: Record<Platform, string[]> = {
  website: ['cdp', 'mitm'],
  application: ['ebpf', 'memoryAnalysis', 'dynamicInstrumentation', 'ldPreload', 'sslKeylog', 'mitmProxy'], // giống terminal: chỉ eBPF được implement
  android: ['mitm'], // Tạm thời chỉ MITM, Frida cần thêm logic device selection phức tạp hơn ở backend
  terminal: ['ebpf', 'memoryAnalysis', 'dynamicInstrumentation', 'ldPreload', 'sslKeylog', 'mitmProxy'], // chỉ eBPF được implement, các method còn lại chỉ liệt kê (implemented: false)
};
