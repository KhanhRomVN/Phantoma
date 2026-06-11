import { SecurityTool } from '../types';
import NmapTool from '../components/Tools/Nmap';
import NiktoTool from '../components/Tools/Nikto';
import SearchsploitTool from '../components/Tools/Searchsploit';
import MetasploitTool from '../components/Tools/Metasploit';
import DorkTool from '../components/Tools/Dork';
import GauTool from '../components/Tools/Gau';
import AmassTool from '../components/Tools/Amass';
import AssetfinderTool from '../components/Tools/Assetfinder';
import SubfinderTool from '../components/Tools/Subfinder';
import NucleiTool from '../components/Tools/Nuclei';
import RustscanTool from '../components/Tools/Rustscan';
import AlienvaultTool from '../components/Tools/Alienvault';
import CertshTool from '../components/Tools/Certsh';

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
    id: 'rustscan',
    name: 'Rustscan',
    shortName: 'RSCAN',
    description:
      'Port scanner siêu tốc viết bằng Rust — quét 65k ports trong 3 giây, tích hợp Nmap pipeline.',
    shortDescription: 'Port scanner siêu tốc, quét 65k ports trong 3 giây',
    category: 'Network',
    tags: ['port-scan', 'fast', 'rust'],
    component: RustscanTool,
    apiEndpoint: '/api/v1/rustscan/scan',
    method: 'POST',
    websiteUrl: 'https://github.com/RustScan/RustScan',
  },
  {
    id: 'nikto',
    name: 'Nikto',
    shortName: 'NIKTO',
    description:
      'Web server vulnerability scanner — kiểm tra 6700+ mẫu nguy hiểm, misconfiguration, outdated software.',
    shortDescription: 'Web vulnerability scanner, 6700+ mẫu nguy hiểm',
    category: 'Web',
    tags: ['web-scan', 'cgi', 'ssl', 'vuln'],
    component: NiktoTool,
    apiEndpoint: '/api/v1/nikto/scan',
    method: 'POST',
    websiteUrl: 'https://github.com/sullo/nikto',
  },
  {
    id: 'nuclei',
    name: 'Nuclei',
    shortName: 'NUCL',
    description:
      'Template-based vulnerability scanner với 5000+ templates — CVE, misconfig, exposed panels, secrets.',
    shortDescription: 'Template-based scanner, 5000+ templates',
    category: 'Vuln',
    tags: ['cve', 'templates', 'http', 'dns'],
    component: NucleiTool,
    apiEndpoint: '/api/v1/nuclei/scan',
    method: 'POST',
    websiteUrl: 'https://github.com/projectdiscovery/nuclei',
  },
  {
    id: 'searchsploit',
    name: 'Searchsploit',
    shortName: 'SPLOIT',
    description:
      'CLI interface cho Exploit-DB — tìm kiếm exploit theo CVE, software, version, platform.',
    shortDescription: 'CLI interface cho Exploit-DB, tìm kiếm exploit',
    category: 'Exploit',
    tags: ['exploit', 'cve', 'exploit-db'],
    component: SearchsploitTool,
    apiEndpoint: '/api/v1/exploit/search',
    method: 'POST',
    websiteUrl: 'https://github.com/offensive-security/exploitdb',
  },
  {
    id: 'metasploit',
    name: 'Metasploit',
    shortName: 'MSF',
    description:
      'Framework khai thác lỗ hổng hàng đầu — 2000+ exploits, payload generator, post-exploitation.',
    shortDescription: 'Framework khai thác lỗ hổng, 2000+ exploits',
    category: 'Exploit',
    tags: ['framework', 'payload', 'post-exploit'],
    component: MetasploitTool,
    apiEndpoint: '/api/v1/exploit/search',
    method: 'POST',
    websiteUrl: 'https://www.metasploit.com',
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
  {
    id: 'subfinder',
    name: 'Subfinder',
    shortName: 'SUBF',
    description:
      'Passive subdomain discovery từ ProjectDiscovery — tích hợp Shodan, Censys, VirusTotal, rapid7.',
    shortDescription: 'Passive subdomain discovery, tích hợp Shodan',
    category: 'OSINT',
    tags: ['subdomain', 'passive', 'dns'],
    component: SubfinderTool,
    apiEndpoint: '/api/v1/subfinder/scan',
    method: 'POST',
    websiteUrl: 'https://github.com/projectdiscovery/subfinder',
  },
  {
    id: 'assetfinder',
    name: 'Assetfinder',
    shortName: 'ASSET',
    description:
      'Domain và subdomain finder từ AlienVault, Wayback, CertSpotter — nhẹ, nhanh, pipeline-friendly.',
    shortDescription: 'Domain & subdomain finder, nhẹ & nhanh',
    category: 'OSINT',
    tags: ['asset', 'domain', 'recon'],
    component: AssetfinderTool,
    apiEndpoint: '/api/v1/assetfinder/scan',
    method: 'POST',
    websiteUrl: 'https://github.com/tomnomnom/assetfinder',
  },
  {
    id: 'gau',
    name: 'GAU',
    shortName: 'GAU',
    description:
      'GetAllUrls — thu thập URL từ Wayback Machine, AlienVault, CommonCrawl, URLScan cho bug bounty.',
    shortDescription: 'Thu thập URL từ Wayback Machine, AlienVault',
    category: 'OSINT',
    tags: ['url', 'wayback', 'crawl', 'recon'],
    component: GauTool,
    apiEndpoint: '/api/v1/gau/fetch',
    method: 'POST',
    websiteUrl: 'https://github.com/lc/gau',
  },
  {
    id: 'go-dork',
    name: 'Go Dork',
    shortName: 'DORK',
    description:
      'Google Dorking engine viết bằng Go — hỗ trợ nhiều search engine, proxy, tìm exposed endpoints.',
    shortDescription: 'Google Dorking engine, hỗ trợ nhiều search engine',
    category: 'OSINT',
    tags: ['dork', 'google', 'search', 'osint'],
    component: DorkTool,
    apiEndpoint: '/api/v1/dork/search',
    method: 'POST',
    websiteUrl: 'https://github.com/dwisiswant0/go-dork',
  },
  {
    id: 'alienvault',
    name: 'AlienVault',
    shortName: 'OTX',
    description:
      'Threat intelligence platform — tra cứu IP/domain/hash, indicators of compromise, malware C2 detection.',
    shortDescription: 'Threat intelligence, tra cứu IOC & malware C2',
    category: 'OSINT',
    tags: ['threat-intel', 'ioc', 'malware', 'c2'],
    component: AlienvaultTool,
    apiEndpoint: '/api/v1/alienvault/scan',
    method: 'POST',
    websiteUrl: 'https://otx.alienvault.com',
  },
  {
    id: 'certsh',
    name: 'Cert.sh',
    shortName: 'CERT',
    description:
      'Certificate Transparency Logs — tìm subdomain từ SSL certs, theo dõi wildcard, passive recon.',
    shortDescription: 'Certificate Transparency Logs, tìm subdomain từ SSL',
    category: 'OSINT',
    tags: ['ssl', 'certificate', 'subdomain', 'passive'],
    component: CertshTool,
    apiEndpoint: '/api/v1/certsh/scan',
    method: 'POST',
    websiteUrl: 'https://crt.sh',
  },
];
