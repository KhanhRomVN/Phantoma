/**
 * Active Scan Category Groups for dynamic tab generation.
 */
import type { SmartCategoryGroup } from './scan-result';

export const SCAN_CATEGORY_GROUPS: Omit<SmartCategoryGroup, 'isActive' | 'count'>[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    accent: '#0af',
    categories: [],
    priority: 0,
    description: 'Tổng quan kết quả active scan: zone transfer, brute-force, misconfig',
  },
  {
    id: 'zone_transfer',
    label: 'Zone Transfer',
    icon: 'Share2',
    accent: '#ff6b35',
    categories: [
      'zone_transfer_success', 'zone_transfer_failed', 'zone_transfer_record',
      'zone_transfer_a', 'zone_transfer_mx', 'zone_transfer_cname',
      'zone_transfer_ns', 'zone_transfer_soa', 'zone_transfer_other',
    ],
    priority: 1,
    description: 'Kết quả AXFR zone transfer: nameserver, records, thành công/thất bại',
  },
  {
    id: 'dns_bruteforce',
    label: 'Brute-force',
    icon: 'Search',
    accent: '#0a84ff',
    categories: [
      'bruteforce_resolved', 'bruteforce_unresolved', 'bruteforce_wildcard',
      'bruteforce_internal', 'bruteforce_public',
    ],
    priority: 2,
    description: 'Kết quả brute-force subdomain với wordlist tùy chỉnh',
  },
  {
    id: 'dns_enum',
    label: 'DNS Enum',
    icon: 'Globe',
    accent: '#30d158',
    categories: [
      'dns_version', 'dns_hostname', 'dns_dnssec', 'dns_nsid',
      'dns_chaos_txt', 'dns_soa_check',
    ],
    priority: 3,
    description: 'Thông tin DNS enumeration: version.bind, hostname.bind, DNSSEC, chaos TXT',
  },
  {
    id: 'misconfig',
    label: 'Misconfigs',
    icon: 'AlertTriangle',
    accent: '#ff375f',
    categories: [
      'misconfig_critical', 'misconfig_high', 'misconfig_medium',
      'misconfig_low', 'misconfig_info',
    ],
    priority: 4,
    description: 'Phát hiện lỗi cấu hình DNS: zone transfer mở, thiếu DNSSEC, wildcard...',
  },
  {
    id: 'raw',
    label: 'Raw / Noise',
    icon: 'FileJson',
    accent: '#6a7a9a',
    categories: ['other', 'unclassified'],
    priority: 10,
    description: 'Dữ liệu thô chưa phân loại, false positives từ wildcard DNS',
  },
  {
    id: 'sources',
    label: 'Sources',
    icon: 'Database',
    accent: '#6a7a9a',
    categories: [],
    priority: 11,
    description: 'Danh sách nguồn dữ liệu và độ tin cậy',
  },
];