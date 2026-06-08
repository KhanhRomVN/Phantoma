/**
 * Network Scan Category Groups for dynamic tab generation.
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
    description: 'Tổng quan kết quả network scan: host discovery, port scan, services, OS',
  },
  {
    id: 'host_discovery',
    label: 'Host Discovery',
    icon: 'Map',
    accent: '#30d158',
    categories: ['host_up', 'host_down', 'host_discovery_result'],
    priority: 1,
    description: 'Hosts phát hiện được trong subnet qua ICMP ping và TCP SYN',
  },
  {
    id: 'port_scan',
    label: 'Port Scan',
    icon: 'Activity',
    accent: '#0a84ff',
    categories: [
      'port_open', 'port_filtered', 'port_closed',
      'port_http', 'port_https', 'port_ssh', 'port_mysql',
      'port_redis', 'port_smtp', 'port_ftp', 'port_dns',
    ],
    priority: 2,
    description: 'Các port mở và filtered trên từng host (top 1000)',
  },
  {
    id: 'service_version',
    label: 'Service Version',
    icon: 'Server',
    accent: '#f5a623',
    categories: [
      'service_http', 'service_https', 'service_ssh', 'service_mysql',
      'service_redis', 'service_smtp', 'service_ftp', 'service_dns',
      'service_nginx', 'service_cloudflare', 'service_postfix',
    ],
    priority: 3,
    description: 'Phát hiện version service: nginx, OpenSSH, MySQL, Redis, Prometheus...',
  },
  {
    id: 'os_detection',
    label: 'OS Detection',
    icon: 'Fingerprint',
    accent: '#ff6b35',
    categories: ['os_linux', 'os_ubuntu', 'os_debian', 'os_freebsd', 'os_unknown'],
    priority: 4,
    description: 'Fingerprinting operating system qua TCP/IP stack',
  },
  {
    id: 'raw',
    label: 'Raw / Noise',
    icon: 'FileJson',
    accent: '#6a7a9a',
    categories: ['other', 'unclassified'],
    priority: 10,
    description: 'Dữ liệu thô chưa phân loại',
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