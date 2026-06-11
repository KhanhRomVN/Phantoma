import amassDoc from '../../../docs/amass.md?raw';

export const AMASS_DOC = amassDoc;

export const MODES = [
  { value: 'enum', label: 'Enumeration', desc: 'Tìm subdomain đầy đủ', default: true },
  { value: 'intel', label: 'Intelligence', desc: 'Thu thập thông tin ASN/whois' },
];

export const OUTPUT_FORMATS = [
  { value: 'text', label: 'Text', flag: '-o' },
  { value: 'json', label: 'JSON', flag: '-json' },
  { value: 'csv', label: 'CSV', flag: '-csv' },
];

export const COMMON_FLAGS = [
  { label: '-passive', value: '-passive', desc: 'Chỉ passive enumeration (không gửi request)' },
  { label: '-active', value: '-active', desc: 'Bật active enumeration (DNS resolution)' },
  { label: '-brute', value: '-brute', desc: 'Brute force subdomain' },
  { label: '-recursive', value: '-recursive', desc: 'Recursive brute force' },
  { label: '-no-dns', value: '-no-dns', desc: 'Bỏ qua DNS resolution' },
  { label: '-v', value: '-v', desc: 'Verbose output' },
  { label: '-vv', value: '-vv', desc: 'Very verbose output' },
  { label: '-log', value: '-log', desc: 'Ghi log ra file' },
  { label: '-json', value: '-json', desc: 'Output JSON' },
  { label: '-csv', value: '-csv', desc: 'Output CSV' },
  { label: '-include', value: '-include', desc: 'Chỉ sử dụng các nguồn cụ thể' },
  { label: '-exclude', value: '-exclude', desc: 'Loại trừ các nguồn' },
];

// Data sources for tooltip/display
export const DATA_SOURCES = [
  'crtsh', 'alienvault', 'wayback', 'shodan', 'censys', 'virustotal',
  'dnsdb', 'archiveit', 'dnsdumpster', 'dnslytics', 'networksdb',
  'binaryedge', 'securitytrails', 'rapiddns', 'sitedossier',
  'threatcrowd', 'threatminer', 'bufferover', 'hackerone'
];