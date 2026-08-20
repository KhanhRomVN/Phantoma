import { SecurityTool } from '../types';
import NmapTool from '../components/Tools/Nmap';
import AmassTool from '../components/Tools/Amass';

export const TOOLS_LIST: SecurityTool[] = [
  {
    id: 'nmap',
    name: 'Nmap',
    shortName: 'NMAP',
    description:
      'Network mapper hàng đầu — quét cổng, phát hiện dịch vụ, OS fingerprinting, và script scanning với NSE engine.',
    shortDescription: 'Quét cổng, phát hiện dịch vụ, OS fingerprinting',
    category: 'Network',
    tags: ['port-scan', 'os-detect', 'nse'],
    component: NmapTool,
    apiEndpoint: '/api/v1/nmap/scan',
    method: 'POST',
    websiteUrl: 'https://nmap.org',
  },
  {
    id: 'amass',
    name: 'Amass',
    shortName: 'AMASS',
    description:
      'OWASP subdomain enumeration mạnh nhất — 100+ nguồn dữ liệu, active/passive recon, network mapping.',
    shortDescription: 'OWASP subdomain enumeration, 100+ nguồn dữ liệu',
    category: 'OSINT',
    tags: ['subdomain', 'dns', 'passive', 'active'],
    component: AmassTool,
    apiEndpoint: '/api/v1/amass/scan',
    method: 'POST',
    websiteUrl: 'https://github.com/owasp-amass/amass',
  },
];
