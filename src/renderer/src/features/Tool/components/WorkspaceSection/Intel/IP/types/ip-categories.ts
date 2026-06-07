/**
 * IP-specific Smart Category Groups for dynamic tab generation.
 */
import type { DomainDataCategory } from '../../Domain/types/domain-data-point';

export type IPDataCategory =
  | DomainDataCategory
  // IP-specific
  | 'ip_reverse_dns'
  | 'ip_ptr_record'
  | 'ip_geo_location'
  | 'ip_isp'
  | 'ip_asn'
  | 'ip_bgp_prefix'
  | 'ip_bgp_peer'
  | 'ip_bgp_aspath'
  | 'ip_cidr'
  | 'ip_netrange'
  | 'ip_abuse_report'
  | 'ip_spam_list'
  | 'ip_threat_intel'
  | 'ip_vulnerability'
  | 'ip_cve'
  | 'ip_ssl_cert'
  | 'ip_service_banner'
  | 'ip_service_version'
  | 'ip_passive_dns'
  | 'ip_historical_dns'
  | 'ip_related_ip';

export interface IPCategoryGroup {
  id: string;
  label: string;
  icon: string;
  accent: string;
  categories: string[];
  priority: number;
  description: string;
  isActive: boolean;
  count: number;
}

export const IP_CATEGORY_GROUPS: Omit<IPCategoryGroup, 'isActive' | 'count'>[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    accent: '#0af',
    categories: [],
    priority: 0,
    description: 'Tổng quan IP: vị trí, ISP, ports, domains, rủi ro',
  },
  {
    id: 'network',
    label: 'Network',
    icon: 'Network',
    accent: '#af52de',
    categories: [
      'ip_reverse_dns', 'ip_ptr_record', 'ip_geo_location', 'ip_isp',
      'ip_asn', 'ip_bgp_prefix', 'ip_bgp_peer', 'ip_bgp_aspath',
      'ip_cidr', 'ip_netrange', 'geo_location', 'asn', 'cidr_range',
      'hosting_provider', 'cloud_provider',
    ],
    priority: 1,
    description: 'Thông tin mạng: reverse DNS, ASN, BGP, CIDR, GeoIP',
  },
  {
    id: 'services',
    label: 'Services',
    icon: 'Server',
    accent: '#30d158',
    categories: [
      'ip_service_banner', 'ip_service_version', 'open_port',
      'service_banner', 'port', 'service', 'http_response',
      'ssl_certificate_chain',
    ],
    priority: 2,
    description: 'Dịch vụ đang chạy: ports, banners, versions (từ Shodan/Censys)',
  },
  {
    id: 'reverse_ip',
    label: 'Reverse IP',
    icon: 'ArrowLeftRight',
    accent: '#0a84ff',
    categories: [
      'reverse_ip', 'ip_passive_dns', 'ip_historical_dns',
      'domain', 'subdomain', 'related_domain',
    ],
    priority: 3,
    description: 'Domain trỏ về IP này (reverse IP / passive DNS)',
  },
  {
    id: 'ssl_certs',
    label: 'SSL Certs',
    icon: 'ShieldCheck',
    accent: '#64d2ff',
    categories: [
      'ip_ssl_cert', 'certificate', 'cert_issuer',
      'cert_domains', 'cert_validity', 'ssl_certificate_chain',
    ],
    priority: 4,
    description: 'Chứng chỉ SSL/TLS trên IP này',
  },
  {
    id: 'vulnerabilities',
    label: 'Vulnerabilities',
    icon: 'Bug',
    accent: '#ff375f',
    categories: [
      'ip_vulnerability', 'ip_cve',
    ],
    priority: 5,
    description: 'Lỗ hổng bảo mật (CVE) liên quan đến services trên IP',
  },
  {
    id: 'reputation',
    label: 'Reputation',
    icon: 'ThumbsDown',
    accent: '#ff2d55',
    categories: [
      'ip_abuse_report', 'ip_spam_list', 'ip_threat_intel',
    ],
    priority: 6,
    description: 'IP reputation: abuse reports, spam lists, threat intelligence',
  },
  {
    id: 'related_ips',
    label: 'Related IPs',
    icon: 'GitBranch',
    accent: '#ff9f0a',
    categories: [
      'ip_related_ip', 'ip_address', 'peer_networks',
    ],
    priority: 7,
    description: 'IP liên quan trong cùng subnet, BGP peers',
  },
  {
    id: 'mentions',
    label: 'Mentions',
    icon: 'MessageCircle',
    accent: '#f5a623',
    categories: [
      'social_mention', 'forum_mention', 'darkweb_mention',
      'pastebin_entry', 'news_mention',
    ],
    priority: 8,
    description: 'Đề cập IP này trên diễn đàn, dark web, pastebin',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: 'Clock',
    accent: '#5e5ce6',
    categories: [],
    priority: 9,
    description: 'Dòng thời gian thay đổi DNS, services, certificates',
  },
  {
    id: 'raw',
    label: 'Raw / Noise',
    icon: 'FileJson',
    accent: '#6a7a9a',
    categories: ['other', 'unclassified'],
    priority: 10,
    description: 'Dữ liệu thô chưa phân loại, false positives',
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