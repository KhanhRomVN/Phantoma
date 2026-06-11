/**
 * IP-specific Smart Category Groups for dynamic tab generation.
 */
import type { SmartCategoryGroup } from './smart-category';
import type { IpDataCategory } from './ip-data-point';

export interface IpCategoryGroup extends Omit<SmartCategoryGroup, 'categories'> {
  categories: IpDataCategory[];
}

export const IP_CATEGORY_GROUPS: Omit<IpCategoryGroup, 'isActive' | 'count'>[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    accent: '#0af',
    categories: [],
    priority: 0,
    description: 'Tổng quan IP: ports, domains, geolocation, threat intel, rủi ro',
  },
  {
    id: 'shodan',
    label: 'Ports & Services',
    icon: 'Router',
    accent: '#ff6b35',
    categories: [
      'open_port', 'service', 'service_banner', 'service_version',
      'http_response', 'ssl_certificate', 'tls_version', 'tls_cipher',
    ],
    priority: 1,
    description: 'Port mở và dịch vụ từ Shodan, Censys',
  },
  {
    id: 'reverse_ip',
    label: 'Hosted Domains',
    icon: 'Globe',
    accent: '#0a84ff',
    categories: [
      'hosted_domain', 'related_domain', 'unrelated_domain', 'primary_domain',
      'passive_dns_domain',
    ],
    priority: 2,
    description: 'Domain được host trên IP này — reverse IP lookup',
  },
  {
    id: 'geoip',
    label: 'GeoIP',
    icon: 'Map',
    accent: '#30d158',
    categories: [
      'geoip_country', 'geoip_city', 'geoip_region', 'geoip_coordinates',
      'geoip_isp', 'geoip_timezone', 'geoip_usage_type',
    ],
    priority: 3,
    description: 'Vị trí địa lý: quốc gia, thành phố, ISP, usage type',
  },
  {
    id: 'bgp',
    label: 'BGP / ASN',
    icon: 'Share2',
    accent: '#af52de',
    categories: [
      'bgp_asn', 'bgp_prefix', 'bgp_peer', 'bgp_upstream', 'bgp_origin',
    ],
    priority: 4,
    description: 'BGP routing, ASN, prefix, peers, upstreams',
  },
  {
    id: 'ssl_certs',
    label: 'SSL Certs',
    icon: 'ShieldCheck',
    accent: '#64d2ff',
    categories: [
      'cert_ip_issuer', 'cert_ip_domains', 'cert_ip_validity', 'cert_ip_san',
    ],
    priority: 5,
    description: 'Chứng chỉ SSL/TLS liên kết với IP này',
  },
  {
    id: 'threat_intel',
    label: 'Threat Intel',
    icon: 'AlertTriangle',
    accent: '#ff375f',
    categories: [
      'threat_report', 'malware_association', 'phishing_association',
      'c2_communication', 'scanner_activity', 'brute_force', 'ddos_participant',
    ],
    priority: 6,
    description: 'Threat intelligence: malware, phishing, C2, scanning',
  },
  {
    id: 'abuse',
    label: 'Abuse Reports',
    icon: 'FileCode',
    accent: '#f5a623',
    categories: [
      'abuse_report', 'spam_report', 'fraud_report', 'hacking_report',
      'spam_listing', 'exploit_listing', 'policy_listing',
      'malware_url',
    ],
    priority: 7,
    description: 'Abuse reports, spam listings, malware URLs',
  },
  {
    id: 'mentions',
    label: 'Mentions',
    icon: 'MessageCircle',
    accent: '#ff9f0a',
    categories: [
      'social_mention', 'forum_mention', 'darkweb_mention',
    ],
    priority: 8,
    description: 'Đề cập trên mạng xã hội, diễn đàn, dark web',
  },
  {
    id: 'reputation',
    label: 'Reputation',
    icon: 'Scale',
    accent: '#5e5ce6',
    categories: [
      'reputation_score', 'reputation_volume', 'noise_classification',
    ],
    priority: 9,
    description: 'Reputation từ Cisco Talos, GreyNoise',
  },
  {
    id: 'indexed',
    label: 'Indexed Pages',
    icon: 'Image',
    accent: '#6a7a9a',
    categories: ['indexed_page'],
    priority: 10,
    description: 'Trang web được index trên CommonCrawl từ IP này',
  },
  {
    id: 'scan_reports',
    label: 'Scan Reports',
    icon: 'EyeOff',
    accent: '#6a7a9a',
    categories: ['scan_report'],
    priority: 11,
    description: 'Báo cáo quét từ Shadowserver',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: 'Clock',
    accent: '#5e5ce6',
    categories: [],
    priority: 14,
    description: 'Dòng thời gian các sự kiện liên quan đến IP',
  },
  {
    id: 'raw',
    label: 'Raw / Noise',
    icon: 'FileJson',
    accent: '#6a7a9a',
    categories: ['other', 'unclassified'],
    priority: 15,
    description: 'Dữ liệu thô chưa phân loại, false positives',
  },
  {
    id: 'sources',
    label: 'Sources',
    icon: 'Database',
    accent: '#6a7a9a',
    categories: [],
    priority: 16,
    description: 'Danh sách nguồn dữ liệu và độ tin cậy',
  },
];