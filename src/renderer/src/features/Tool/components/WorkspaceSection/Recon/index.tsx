// src/renderer/src/features/Tool/components/WorkspaceSection/Recon/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import { Badge, KVRow, ModuleTabBar, ToolbarButton } from '../../../../../core/components/ui';

// ============================================================================
// 1. MOCK DATA ĐẦY ĐỦ & CHI TIẾT (cho target: "phantom.tech")
// ============================================================================
const TARGET = 'phantom.tech';
const TARGET_IP = '198.51.100.78';

// --- DNS Records (mở rộng) ---
const dnsRecords = {
  A: [TARGET_IP, '198.51.100.79', '198.51.100.80'],
  AAAA: ['2001:db8:ac10:fe01::1', '2001:db8:ac10:fe01::2'],
  MX: [
    { priority: 10, exchange: 'mx1.phantom.tech' },
    { priority: 20, exchange: 'mx2.phantom.tech' },
    { priority: 30, exchange: 'aspmx.l.google.com' },
  ],
  TXT: [
    'v=spf1 ip4:198.51.100.0/24 include:_spf.google.com ~all',
    'google-site-verification=AbCdEfG123456',
    'MS=ms9876543210',
    'atlassian-domain-verification=abc123',
    'ZOOM_verify=xyz789',
  ],
  NS: ['ns1.digitalocean.com', 'ns2.digitalocean.com', 'ns3.digitalocean.com'],
  SOA: {
    mname: 'ns1.digitalocean.com',
    rname: 'hostmaster.phantom.tech',
    serial: 2025060201,
    refresh: 3600,
    retry: 1800,
    expire: 1209600,
    ttl: 180,
  },
  CNAME: { www: 'phantom.tech', mail: 'mailgun.phantom.tech' },
  PTR: { [TARGET_IP]: 'phantom.tech' },
  NSEC3: false,
  DS: [],
  DNSKEY: [],
  RRSIG: false,
};

// --- WHOIS (siêu chi tiết) ---
const whoisData = {
  domain: TARGET,
  status: 'clientTransferProhibited',
  registrar: {
    name: 'NameCheap, Inc.',
    url: 'https://www.namecheap.com',
    iana_id: 1068,
    abuse_email: 'abuse@namecheap.com',
    abuse_phone: '+1.6613102107',
  },
  dates: {
    created: '2021-08-15T12:00:00Z',
    updated: '2025-02-20T08:30:00Z',
    expired: '2026-08-15T12:00:00Z',
  },
  nameservers: ['ns1.digitalocean.com', 'ns2.digitalocean.com', 'ns3.digitalocean.com'],
  registrant: {
    name: 'Phantom Security Ltd',
    organization: 'Phantom Security Ltd',
    street: '123 Cyber Street',
    city: 'San Francisco',
    state: 'CA',
    postal: '94105',
    country: 'US',
    phone: '+1.5551234567',
    fax: '+1.5551234568',
    email: 'admin@phantom.tech',
  },
  admin: {
    name: 'Admin Role',
    organization: 'Phantom Security Ltd',
    street: '123 Cyber Street',
    city: 'San Francisco',
    state: 'CA',
    postal: '94105',
    country: 'US',
    phone: '+1.5551234567',
    email: 'admin@phantom.tech',
  },
  tech: {
    name: 'Tech Team',
    organization: 'Phantom Security Ltd',
    street: '123 Cyber Street',
    city: 'San Francisco',
    state: 'CA',
    postal: '94105',
    country: 'US',
    phone: '+1.5551234567',
    email: 'tech@phantom.tech',
  },
  billing: {
    name: 'Billing Department',
    organization: 'Phantom Security Ltd',
    email: 'billing@phantom.tech',
  },
};

// --- Breach Data (HIBP + custom) ---
const breaches = [
  {
    name: 'Phantom Security Data Breach 2025',
    date: '2025-01-15',
    added: '2025-01-20',
    accounts: 1250000,
    categories: ['emails', 'passwords', 'usernames', 'ips', 'payment'],
    severity: 'CRITICAL',
    description:
      'Internal database exposed via misconfigured MongoDB instance. Contains hashed passwords, emails, and PII.',
    dataClasses: ['Email addresses', 'Passwords', 'Usernames', 'IP addresses', 'Payment histories'],
    isVerified: true,
  },
  {
    name: 'LinkedIn 2021',
    date: '2021-06-22',
    added: '2021-07-10',
    accounts: 700000000,
    categories: ['emails', 'passwords'],
    severity: 'CRITICAL',
    description:
      'Scraped data from LinkedIn containing email addresses and passwords (SHA-1 hashed).',
    dataClasses: ['Email addresses', 'Passwords'],
    isVerified: true,
  },
  {
    name: 'Collection #1',
    date: '2019-01-07',
    added: '2019-02-17',
    accounts: 773000000,
    categories: ['emails', 'passwords'],
    severity: 'HIGH',
    description: 'Massive collection of email addresses and passwords from many previous breaches.',
    dataClasses: ['Email addresses', 'Passwords'],
    isVerified: true,
  },
  {
    name: 'Adobe 2013',
    date: '2013-10-04',
    added: '2013-11-01',
    accounts: 152445165,
    categories: ['emails', 'passwords', 'hints'],
    severity: 'MEDIUM',
    description: 'Adobe breach with encrypted passwords and password hints.',
    dataClasses: ['Email addresses', 'Password hints', 'Passwords'],
    isVerified: true,
  },
];

// --- Email Harvest (mở rộng) ---
const harvestedEmails = [
  {
    email: 'admin@phantom.tech',
    source: 'WHOIS',
    verified: true,
    role: 'Administrator',
    firstSeen: '2021-08-15',
  },
  {
    email: 'security@phantom.tech',
    source: 'GitHub',
    verified: true,
    role: 'Security Team',
    firstSeen: '2022-03-10',
  },
  {
    email: 'support@phantom.tech',
    source: 'LinkedIn',
    verified: false,
    role: 'Support',
    firstSeen: '2023-01-20',
  },
  {
    email: 'john.doe@phantom.tech',
    source: 'Twitter',
    verified: true,
    role: 'Employee',
    firstSeen: '2022-11-05',
  },
  {
    email: 'contact@phantom.tech',
    source: 'PGP Keyserver',
    verified: true,
    role: 'Contact',
    firstSeen: '2021-09-12',
  },
  {
    email: 'sales@phantom.tech',
    source: 'Crunchbase',
    verified: false,
    role: 'Sales',
    firstSeen: '2023-04-18',
  },
  {
    email: 'marketing@phantom.tech',
    source: 'SpyFu',
    verified: false,
    role: 'Marketing',
    firstSeen: '2023-06-22',
  },
  {
    email: 'abuse@phantom.tech',
    source: 'WHOIS (registrar)',
    verified: true,
    role: 'Abuse Contact',
    firstSeen: '2021-08-15',
  },
];

// --- Shodan Data (phong phú) ---
const shodanData = {
  ip: TARGET_IP,
  hostnames: ['phantom.tech', 'www.phantom.tech'],
  org: 'DigitalOcean, LLC',
  isp: 'DigitalOcean',
  asn: 'AS14061',
  country: 'US',
  city: 'Santa Clara',
  postal: '95054',
  latitude: 37.3541,
  longitude: -121.9552,
  os: 'Ubuntu 22.04',
  ports: [
    {
      port: 22,
      service: 'ssh',
      product: 'OpenSSH',
      version: '8.9p1 Ubuntu 3ubuntu0.4',
      state: 'open',
      vulns: ['CVE-2023-38408'],
      banner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.4',
    },
    {
      port: 80,
      service: 'http',
      product: 'nginx',
      version: '1.24.0',
      state: 'open',
      vulns: [],
      banner: 'HTTP/1.1 200 OK\r\nServer: nginx/1.24.0',
    },
    {
      port: 443,
      service: 'https',
      product: 'nginx',
      version: '1.24.0',
      state: 'open',
      vulns: [],
      banner: 'TLS 1.3, certificate for phantom.tech',
    },
    {
      port: 3306,
      service: 'mysql',
      product: 'MySQL',
      version: '8.0.33',
      state: 'open',
      vulns: ['CVE-2023-2182'],
      banner: 'mysql_native_password',
    },
    {
      port: 8080,
      service: 'http',
      product: 'Jenkins',
      version: '2.401.1',
      state: 'open',
      vulns: ['CVE-2023-27898'],
      banner: 'Jenkins CI/Jenkins 2.401.1',
    },
    {
      port: 8443,
      service: 'https',
      product: 'Apache Tomcat',
      version: '9.0.78',
      state: 'open',
      vulns: ['CVE-2023-28708'],
      banner: 'Apache Tomcat/9.0.78',
    },
    {
      port: 27017,
      service: 'mongodb',
      product: 'MongoDB',
      version: '5.0.14',
      state: 'filtered',
      vulns: [],
      banner: '',
    },
  ],
  vulns: [
    {
      cve: 'CVE-2023-38408',
      cvss: 9.8,
      description: 'OpenSSH vulnerability allows remote code execution under certain conditions.',
    },
    {
      cve: 'CVE-2023-2182',
      cvss: 7.5,
      description: 'MySQL 8.0.33 is vulnerable to a denial-of-service attack.',
    },
    {
      cve: 'CVE-2023-27898',
      cvss: 8.9,
      description: 'Jenkins vulnerable to authentication bypass via crafted HTTP requests.',
    },
    { cve: 'CVE-2023-28708', cvss: 7.3, description: 'Tomcat session fixation vulnerability.' },
  ],
  tags: ['cloud', 'ubuntu', 'nginx', 'https', 'jenkins', 'tomcat', 'mysql'],
};

// --- Subdomains (mở rộng, 20+ items) ---
const subdomains = [
  {
    name: 'admin.phantom.tech',
    status: 200,
    risk: 'high',
    title: 'Admin Dashboard',
    server: 'nginx/1.24.0',
    contentLength: 12453,
  },
  {
    name: 'api.phantom.tech',
    status: 200,
    risk: 'normal',
    title: 'API Gateway',
    server: 'nginx/1.24.0',
    contentLength: 234,
  },
  {
    name: 'jenkins.phantom.tech',
    status: 200,
    risk: 'high',
    title: 'Jenkins CI',
    server: 'Jetty/9.4.48',
    contentLength: 8921,
  },
  {
    name: 'vpn.phantom.tech',
    status: 200,
    risk: 'high',
    title: 'VPN Portal',
    server: 'OpenResty',
    contentLength: 4500,
  },
  {
    name: 'dev.phantom.tech',
    status: 403,
    risk: 'normal',
    title: 'Forbidden',
    server: 'nginx/1.24.0',
    contentLength: 162,
  },
  {
    name: 'mail.phantom.tech',
    status: 301,
    risk: 'normal',
    title: 'Redirect',
    server: 'nginx/1.24.0',
    contentLength: 178,
  },
  {
    name: 'git.phantom.tech',
    status: 200,
    risk: 'high',
    title: 'Gitea',
    server: 'Go',
    contentLength: 6210,
  },
  {
    name: 'staging.phantom.tech',
    status: 404,
    risk: 'none',
    title: 'Not Found',
    server: 'nginx/1.24.0',
    contentLength: 153,
  },
  {
    name: 'test.phantom.tech',
    status: 200,
    risk: 'normal',
    title: 'Test Environment',
    server: 'Apache/2.4.52',
    contentLength: 890,
  },
  {
    name: 'backup.phantom.tech',
    status: 401,
    risk: 'medium',
    title: 'Authorization Required',
    server: 'nginx/1.24.0',
    contentLength: 172,
  },
  {
    name: 'dashboard.phantom.tech',
    status: 200,
    risk: 'normal',
    title: 'Dashboard',
    server: 'nginx/1.24.0',
    contentLength: 4550,
  },
  {
    name: 'cdn.phantom.tech',
    status: 200,
    risk: 'none',
    title: 'CDN',
    server: 'cloudflare',
    contentLength: 98,
  },
  {
    name: 'blog.phantom.tech',
    status: 200,
    risk: 'normal',
    title: 'Blog',
    server: 'WordPress',
    contentLength: 25400,
  },
  {
    name: 'forum.phantom.tech',
    status: 200,
    risk: 'normal',
    title: 'Community Forum',
    server: 'phpBB',
    contentLength: 17820,
  },
  {
    name: 'partner.phantom.tech',
    status: 200,
    risk: 'medium',
    title: 'Partner Portal',
    server: 'IIS/10.0',
    contentLength: 3890,
  },
  {
    name: 'remote.phantom.tech',
    status: 403,
    risk: 'medium',
    title: 'Access Denied',
    server: 'nginx/1.24.0',
    contentLength: 169,
  },
];

// --- Technology Stack (đầy đủ) ---
const techStack = {
  webServer: {
    name: 'nginx',
    version: '1.24.0',
    poweredBy: 'Express',
    modules: ['ngx_http_ssl_module', 'ngx_http_v2_module'],
  },
  backend: { language: 'Node.js', version: '18.17.0', framework: 'Express 4.18.2', runtime: 'PM2' },
  frontend: {
    framework: 'React 18.2.0',
    libraries: ['Redux Toolkit', 'TailwindCSS', 'Axios', 'React Router v6'],
    ssr: false,
  },
  database: {
    type: 'PostgreSQL',
    version: '14.8',
    engine: 'PostGIS',
    replicas: 2,
    backup: 'daily',
  },
  cms: null,
  cdn: 'Cloudflare',
  ssl: {
    issuer: "Let's Encrypt",
    protocol: 'TLS 1.3',
    expiry: '2025-12-01',
    curve: 'X25519',
    ocsp_stapling: true,
  },
  analytics: 'Google Analytics 4, Hotjar',
  hosting: 'DigitalOcean (SFO3), droplet size: 8GB RAM, 4 vCPUs',
  container: 'Docker (compose)',
  orchestration: 'none (bare metal)',
};

// --- SSL/TLS Details (mở rộng) ---
const sslDetails = {
  certificate: {
    subject: 'CN=phantom.tech, O=Phantom Security Ltd, L=San Francisco, ST=CA, C=US',
    issuer: "CN=R3, O=Let's Encrypt, C=US",
    validity: { from: '2025-03-01T00:00:00Z', to: '2025-12-01T23:59:59Z' },
    san: [
      'phantom.tech',
      '*.phantom.tech',
      'www.phantom.tech',
      'api.phantom.tech',
      'admin.phantom.tech',
    ],
    keyType: 'RSA 2048 bits',
    signatureAlgorithm: 'SHA-256 with RSA',
    fingerprint:
      'SHA256: 2B:3C:4D:5E:6F:7A:8B:9C:0D:1E:2F:3A:4B:5C:6D:7E:8F:9A:0B:1C:2D:3E:4F:5A:6B:7C:8D:9E:0F:1A:2B:3C',
  },
  chain: [
    "CN=R3, O=Let's Encrypt, C=US",
    'CN=ISRG Root X1, O=Internet Security Research Group, C=US',
  ],
  protocols: ['TLSv1.2', 'TLSv1.3'],
  cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_AES_128_GCM_SHA256', 'ECDHE-RSA-AES256-GCM-SHA384'],
  handshake: {
    keyExchange: 'ECDHE (secp256r1)',
    authentication: 'RSA',
    encryption: 'AES_256_GCM',
    mac: 'AEAD',
  },
  vulnerabilities: {
    heartbleed: false,
    poodle: false,
    freak: false,
    logjam: false,
    beast: false,
    crime: false,
    renegotiation: 'secure',
  },
};

// --- Google Dorks Results (mẫu) ---
const googleDorks = [
  {
    type: 'Admin Panels',
    query: `site:${TARGET} intitle:"admin" OR intitle:"login"`,
    results: 12,
    foundUrls: ['https://admin.phantom.tech', 'https://dashboard.phantom.tech/login'],
  },
  {
    type: 'Sensitive Files',
    query: `site:${TARGET} filetype:sql OR filetype:log OR filetype:conf`,
    results: 7,
    foundUrls: ['https://git.phantom.tech/db_backup.sql', 'https://api.phantom.tech/.env'],
  },
  {
    type: 'PHP Info',
    query: `site:${TARGET} intitle:"phpinfo()"`,
    results: 1,
    foundUrls: ['https://test.phantom.tech/info.php'],
  },
  {
    type: 'Git Repositories',
    query: `site:${TARGET} ".git"`,
    results: 2,
    foundUrls: ['https://git.phantom.tech/.git/config'],
  },
  {
    type: 'Backup Files',
    query: `site:${TARGET} ext:bak | ext:old | ext:backup`,
    results: 3,
    foundUrls: ['https://backup.phantom.tech/data.old'],
  },
];

// --- DNS History (SecurityTrails like) ---
const dnsHistory = [
  { type: 'A', value: '198.51.100.78', first_seen: '2024-01-10', last_seen: '2025-06-02' },
  { type: 'A', value: '198.51.100.100', first_seen: '2023-08-01', last_seen: '2024-01-05' },
  { type: 'MX', value: 'mx1.phantom.tech', first_seen: '2021-08-15', last_seen: '2025-06-02' },
  { type: 'MX', value: 'aspmx.l.google.com', first_seen: '2024-03-20', last_seen: '2025-06-02' },
];

// --- Related Domains / Certificates (Censys-like) ---
const relatedDomains = [
  { domain: 'phantomsecurity.com', relationship: 'subjectAltName (cert)', ip: '198.51.100.200' },
  { domain: 'phantomlabs.io', relationship: 'MX record', ip: null },
  { domain: 'phantom-support.net', relationship: 'WHOIS registrant email', ip: null },
  { domain: 'phantomcdn.com', relationship: 'CNAME to cdn.phantom.tech', ip: '104.18.32.15' },
];

// --- HTTP Headers (target home page) ---
const httpHeaders = {
  server: 'nginx/1.24.0',
  'content-type': 'text/html; charset=UTF-8',
  'x-powered-by': 'Express',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'content-security-policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com;",
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-xss-protection': '1; mode=block',
  'set-cookie': 'sessionId=abc123; HttpOnly; Secure; SameSite=Strict',
  vary: 'Accept-Encoding',
};

// --- WAF Detection (WAFW00F style) ---
const wafInfo = {
  detected: true,
  name: 'Cloudflare',
  vendor: 'Cloudflare, Inc.',
  version: 'Enterprise',
  bypassHints: [
    'Use chunked encoding',
    'Add null bytes',
    'Change case of headers',
    'Use Unicode normalization',
  ],
  fingerprints: ['cf-ray header', '__cfduid cookie', 'server: cloudflare'],
};

// --- ASN & BGP Info ---
const asnInfo = {
  asn: 'AS14061',
  name: 'DIGITALOCEAN-ASN',
  country: 'US',
  registry: 'arin',
  prefixes: ['198.51.100.0/24', '198.55.100.0/22'],
  upstreams: ['AS2914 (NTT America)'],
  peers: ['AS15169 (Google)', 'AS32934 (Facebook)'],
};

// ============================================================================
// 2. UI COMPONENTS
// ============================================================================
const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
);
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />;
const TbLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] mx-0.5 whitespace-nowrap">
    {children}
  </span>
);

function OsintCard({ title, icon, children, highlight, colSpan2, className }: any) {
  return (
    <div
      className={cn(
        'bg-[#111520] border rounded-[7px] p-3',
        highlight ? 'border-red-500/20' : 'border-[#1e2535]',
        colSpan2 && 'col-span-2',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.08em] mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function SubdomainGrid() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {subdomains.map((s) => (
        <div
          key={s.name}
          className={cn(
            'bg-[#161b26] border rounded p-2',
            s.risk === 'high'
              ? 'border-red-500/20'
              : s.risk === 'medium'
                ? 'border-amber-500/20'
                : 'border-[#1e2535]',
          )}
        >
          <div className="text-[9px] text-[#3d4a61]">
            {s.status} - {s.title?.slice(0, 15)}
          </div>
          <div
            className={cn(
              'text-[11px] font-mono truncate mt-0.5',
              s.risk === 'high'
                ? 'text-red-400'
                : s.status === 404
                  ? 'text-[#6b7a96]'
                  : 'text-[#c5cfe0]',
            )}
          >
            {s.name.split('.')[0]}.…
          </div>
          {s.contentLength && (
            <div className="text-[8px] text-[#3d4a61] mt-1">{s.contentLength} bytes</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS (Mỗi tab là một khối dữ liệu khổng lồ)
// ============================================================================

function TabOverview() {
  return (
    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 p-[10px] bg-[#080a0e]">
      <OsintCard
        title="IP & Network"
        icon={
          <svg
            className="w-3 h-3 text-cyan-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="8" cy="8" r="6" />
          </svg>
        }
      >
        <KVRow label="Primary IP" value={TARGET_IP} valueColor="text-cyan-400" />
        <KVRow label="IPv6" value="2001:db8:ac10:fe01::1" valueColor="text-cyan-400" />
        <KVRow label="ASN" value={`${asnInfo.asn} (${asnInfo.name})`} />
        <KVRow label="ISP" value={shodanData.isp} />
        <KVRow
          label="Location"
          value={`${shodanData.city}, ${shodanData.country} (${shodanData.latitude}, ${shodanData.longitude})`}
        />
        <KVRow label="Hosting" value="DigitalOcean Cloud" valueColor="text-amber-400" />
        <KVRow label="RDNS" value="phantom.tech" />
      </OsintCard>

      <OsintCard
        title="DNS Summary"
        icon={
          <svg
            className="w-3 h-3 text-green-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
          >
            <path d="M2 4h12M2 8h8M2 12h10" />
          </svg>
        }
      >
        <KVRow label="A Records" value={dnsRecords.A.join(', ')} valueColor="text-cyan-400" />
        <KVRow
          label="MX (primary)"
          value={`${dnsRecords.MX[0].priority} ${dnsRecords.MX[0].exchange}`}
        />
        <KVRow
          label="SPF"
          value={dnsRecords.TXT.find((t) => t.includes('v=spf'))?.slice(0, 40) + '…'}
          valueColor="text-green-400"
        />
        <KVRow label="DMARC" value="p=reject (enforced)" valueColor="text-green-400" />
        <KVRow label="Zone Transfer" value="NOT ALLOWED" valueColor="text-green-400" />
        <KVRow label="Subdomains" value={`${subdomains.length} found`} valueColor="text-cyan-400" />
      </OsintCard>

      <OsintCard
        title="Technology Stack"
        icon={
          <svg
            className="w-3 h-3 text-purple-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
          >
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
        }
      >
        <KVRow
          label="Web Server"
          value={`${techStack.webServer.name}/${techStack.webServer.version}`}
        />
        <KVRow
          label="Backend"
          value={`${techStack.backend.language} ${techStack.backend.version} (${techStack.backend.framework})`}
          valueColor="text-cyan-400"
        />
        <KVRow
          label="Frontend"
          value={`${techStack.frontend.framework} + ${techStack.frontend.libraries.join(', ')}`}
        />
        <KVRow
          label="Database"
          value={`${techStack.database.type} ${techStack.database.version} (${techStack.database.engine})`}
        />
        <KVRow label="CDN" value={techStack.cdn} />
        <KVRow
          label="SSL"
          value={`${techStack.ssl.protocol} (${techStack.ssl.issuer})`}
          valueColor="text-green-400"
        />
      </OsintCard>

      <OsintCard
        title="SSL / TLS Details"
        icon={
          <svg
            className="w-3 h-3 text-amber-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M5 8L7 10L11 6" />
          </svg>
        }
      >
        <KVRow
          label="Common Name"
          value={sslDetails.certificate.subject.split(',')[0].split('=')[1]}
        />
        <KVRow label="Issuer" value={sslDetails.certificate.issuer} />
        <KVRow
          label="Valid To"
          value={sslDetails.certificate.validity.to.split('T')[0]}
          valueColor="text-green-400"
        />
        <KVRow
          label="SANs"
          value={
            sslDetails.certificate.san.slice(0, 3).join(', ') +
            (sslDetails.certificate.san.length > 3 ? '…' : '')
          }
        />
        <KVRow label="Cipher Suite" value={sslDetails.cipherSuites[0]} valueColor="text-cyan-400" />
        <KVRow label="Key Exchange" value={sslDetails.handshake.keyExchange} />
      </OsintCard>

      <OsintCard
        title="Subdomains Found (Top 8)"
        icon={
          <svg
            className="w-3 h-3 text-cyan-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
          >
            <path d="M3 8h10M8 3v10" />
          </svg>
        }
        colSpan2
      >
        <SubdomainGrid />
      </OsintCard>
    </div>
  );
}

function TabDNSEnum() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        <OsintCard title="A & AAAA Records">
          <KVRow label="A (IPv4)" value={dnsRecords.A.join(', ')} valueColor="text-cyan-400" />
          <KVRow
            label="AAAA (IPv6)"
            value={dnsRecords.AAAA.join(', ')}
            valueColor="text-cyan-400"
          />
        </OsintCard>
        <OsintCard title="MX Records (Mail Exchange)">
          {dnsRecords.MX.map((mx, i) => (
            <KVRow key={i} label={`Priority ${mx.priority}`} value={mx.exchange} />
          ))}
        </OsintCard>
        <OsintCard title="TXT Records">
          {dnsRecords.TXT.map((txt, i) => (
            <div key={i} className="text-[10.5px] text-[#c5cfe0] break-all mb-1">
              "{txt}"
            </div>
          ))}
        </OsintCard>
        <OsintCard title="NS & SOA">
          <KVRow label="Name Servers" value={dnsRecords.NS.join(', ')} />
          <KVRow label="Primary NS" value={dnsRecords.SOA.mname} />
          <KVRow label="Email (rname)" value={dnsRecords.SOA.rname} />
          <KVRow label="Serial" value={dnsRecords.SOA.serial.toString()} />
        </OsintCard>
        <OsintCard title="CNAME Records">
          <KVRow label="www" value={dnsRecords.CNAME.www} />
          <KVRow label="mail" value={dnsRecords.CNAME.mail} />
        </OsintCard>
        <OsintCard title="DNS History (last 2 years)">
          {dnsHistory.map((h, i) => (
            <KVRow
              key={i}
              label={`${h.type} ${h.value}`}
              value={`${h.first_seen} → ${h.last_seen}`}
              valueColor="text-[#6b7a96]"
            />
          ))}
        </OsintCard>
        <OsintCard title="DNS Security" colSpan2>
          <KVRow label="DNSSEC" value="Not Signed" valueColor="text-amber-400" />
          <KVRow label="CAA Records" value="None found" />
          <KVRow label="SPF (strict)" value="~all (softfail)" />
          <KVRow label="DKIM" value="No record found (may use third-party)" />
        </OsintCard>
      </div>
    </div>
  );
}

function TabWHOIS() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        <OsintCard title="Domain Information">
          <KVRow label="Domain" value={whoisData.domain} valueColor="text-cyan-400" />
          <KVRow label="Status" value={whoisData.status} />
          <KVRow
            label="Registrar"
            value={`${whoisData.registrar.name} (IANA ID: ${whoisData.registrar.iana_id})`}
          />
          <KVRow label="Creation Date" value={whoisData.dates.created.split('T')[0]} />
          <KVRow
            label="Expiry Date"
            value={whoisData.dates.expired.split('T')[0]}
            valueColor="text-amber-400"
          />
          <KVRow label="Updated Date" value={whoisData.dates.updated.split('T')[0]} />
        </OsintCard>
        <OsintCard title="Registrant & Contacts">
          <KVRow label="Registrant Name" value={whoisData.registrant.name} />
          <KVRow label="Organization" value={whoisData.registrant.organization} />
          <KVRow
            label="Address"
            value={`${whoisData.registrant.street}, ${whoisData.registrant.city}, ${whoisData.registrant.state} ${whoisData.registrant.postal}`}
          />
          <KVRow label="Country" value={whoisData.registrant.country} />
          <KVRow label="Phone" value={whoisData.registrant.phone} />
          <KVRow
            label="Email (Registrant)"
            value={whoisData.registrant.email}
            valueColor="text-cyan-400"
          />
          <KVRow label="Admin Email" value={whoisData.admin.email} />
          <KVRow label="Tech Email" value={whoisData.tech.email} />
        </OsintCard>
        <OsintCard title="Registrar Abuse Contact">
          <KVRow label="Email" value={whoisData.registrar.abuse_email} />
          <KVRow label="Phone" value={whoisData.registrar.abuse_phone} />
        </OsintCard>
        <OsintCard title="Name Servers" colSpan2>
          {whoisData.nameservers.map((ns, i) => (
            <div key={i} className="text-[11px] font-mono text-[#c5cfe0]">
              {ns}
            </div>
          ))}
        </OsintCard>
      </div>
    </div>
  );
}

function TabBreach() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="space-y-2">
        {breaches.map((breach, idx) => (
          <div
            key={idx}
            className={cn(
              'bg-[#111520] border rounded p-3',
              breach.severity === 'CRITICAL' ? 'border-red-500/30' : 'border-[#1e2535]',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold text-[#c5cfe0]">{breach.name}</span>
              <Badge
                color={
                  breach.severity === 'CRITICAL'
                    ? 'red'
                    : breach.severity === 'HIGH'
                      ? 'red'
                      : 'amber'
                }
              >
                {breach.severity}
              </Badge>
            </div>
            <div className="text-[10px] text-[#6b7a96]">
              Date: {breach.date} | Accounts: {breach.accounts.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#6b7a96] mt-1">
              Categories: {breach.categories.join(', ')}
            </div>
            <div className="text-[10px] text-[#c5cfe0] mt-1">{breach.description}</div>
          </div>
        ))}
        <div className="mt-2 text-[10px] text-[#3d4a61] italic">
          * Data aggregated from HaveIBeenPwned, DeHashed, and public dumps
        </div>
      </div>
    </div>
  );
}

function TabEmailHarvest() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        <table className="w-full text-[11px]">
          <thead className="border-b border-[#1e2535]">
            <tr>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">Email</th>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">Role</th>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">Source</th>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">Verified</th>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">First Seen</th>
            </tr>
          </thead>
          <tbody>
            {harvestedEmails.map((item, idx) => (
              <tr key={idx} className="border-b border-[#1e2535] last:border-0">
                <td className="p-2 font-mono text-cyan-400">{item.email}</td>
                <td className="p-2 text-[#c5cfe0]">{item.role}</td>
                <td className="p-2 text-[#6b7a96]">{item.source}</td>
                <td className="p-2">
                  {item.verified ? (
                    <Badge color="green">✔️ Yes</Badge>
                  ) : (
                    <Badge color="gray">Unverified</Badge>
                  )}
                </td>
                <td className="p-2 text-[#6b7a96]">{item.firstSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-[10px] text-[#3d4a61]">
        Total unique emails: {harvestedEmails.length} | Potential password reuse risk:
        admin@phantom.tech appears in breach data.
      </div>
    </div>
  );
}

function TabShodan() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        <OsintCard title="Host Information">
          <KVRow label="IP" value={shodanData.ip} valueColor="text-cyan-400" />
          <KVRow label="Hostnames" value={shodanData.hostnames.join(', ')} />
          <KVRow label="Organization" value={shodanData.org} />
          <KVRow label="ASN" value={shodanData.asn} />
          <KVRow label="OS" value={shodanData.os} />
          <KVRow
            label="Location"
            value={`${shodanData.city}, ${shodanData.country} (${shodanData.latitude}, ${shodanData.longitude})`}
          />
        </OsintCard>
        <OsintCard title="Open Ports & Services">
          {shodanData.ports.map((p, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between">
                <span className="font-mono text-amber-400">
                  {p.port}/{p.service}
                </span>
                <span className="text-[10px] text-[#6b7a96]">
                  {p.product} {p.version}
                </span>
              </div>
              {p.vulns.length > 0 && (
                <div className="text-[9px] text-red-400">Vulns: {p.vulns.join(', ')}</div>
              )}
            </div>
          ))}
        </OsintCard>
        <OsintCard title="Vulnerabilities (CVE)" colSpan2>
          {shodanData.vulns.map((v, i) => (
            <div key={i} className="mb-2 border-b border-[#1e2535] pb-2 last:border-0">
              <div className="flex justify-between">
                <span className="font-mono text-red-400">
                  {v.cve} (CVSS {v.cvss})
                </span>
              </div>
              <div className="text-[10px] text-[#c5cfe0]">{v.description}</div>
            </div>
          ))}
        </OsintCard>
      </div>
    </div>
  );
}

function TabGoogleDorks() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="space-y-2">
        {googleDorks.map((d, idx) => (
          <div key={idx} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] font-semibold text-cyan-400">{d.type}</span>
              <Badge color="gray">{d.results} results</Badge>
            </div>
            <div className="text-[10px] font-mono text-[#6b7a96] break-all">{d.query}</div>
            <div className="mt-1 text-[10px] text-[#c5cfe0]">
              Found URLs: {d.foundUrls.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabRelatedDomains() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        <table className="w-full text-[11px]">
          <thead className="border-b border-[#1e2535]">
            <tr>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">Domain</th>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">Relationship</th>
              <th className="text-left p-2 text-[#3d4a61] font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            {relatedDomains.map((d, idx) => (
              <tr key={idx} className="border-b border-[#1e2535] last:border-0">
                <td className="p-2 font-mono text-cyan-400">{d.domain}</td>
                <td className="p-2 text-[#c5cfe0]">{d.relationship}</td>
                <td className="p-2 text-[#6b7a96]">{d.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabHTTPHeaders() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <OsintCard title="Response Headers (https://phantom.tech)" colSpan2>
        {Object.entries(httpHeaders).map(([key, value]) => (
          <KVRow
            key={key}
            label={key}
            value={value}
            valueColor={key.includes('security') ? 'text-green-400' : 'text-[#c5cfe0]'}
          />
        ))}
      </OsintCard>
    </div>
  );
}

function TabWAF() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        <OsintCard title="WAF Detection">
          <KVRow
            label="Detected"
            value={wafInfo.detected ? 'Yes' : 'No'}
            valueColor={wafInfo.detected ? 'text-red-400' : 'text-green-400'}
          />
          <KVRow label="Name" value={wafInfo.name} />
          <KVRow label="Vendor" value={wafInfo.vendor} />
          <KVRow label="Version" value={wafInfo.version} />
        </OsintCard>
        <OsintCard title="Fingerprints">
          {wafInfo.fingerprints.map((f, i) => (
            <div key={i} className="text-[10px] font-mono text-[#6b7a96]">
              {f}
            </div>
          ))}
        </OsintCard>
        <OsintCard title="Bypass Hints" colSpan2>
          <ul className="list-disc list-inside text-[10px] text-amber-400">
            {wafInfo.bypassHints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </OsintCard>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================
const TABS = [
  'Overview',
  'DNS Enum',
  'WHOIS',
  'Breach Data',
  'Email Harvest',
  'Shodan',
  'Google Dorks',
  'Related Domains',
  'HTTP Headers',
  'WAF',
] as const;

export function Recon() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return <TabOverview />;
      case 'DNS Enum':
        return <TabDNSEnum />;
      case 'WHOIS':
        return <TabWHOIS />;
      case 'Breach Data':
        return <TabBreach />;
      case 'Email Harvest':
        return <TabEmailHarvest />;
      case 'Shodan':
        return <TabShodan />;
      case 'Google Dorks':
        return <TabGoogleDorks />;
      case 'Related Domains':
        return <TabRelatedDomains />;
      case 'HTTP Headers':
        return <TabHTTPHeaders />;
      case 'WAF':
        return <TabWAF />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-cyan-400 border-cyan-400 bg-cyan-500/5"
      />
      <Toolbar>
        <TbLabel>Target:</TbLabel>
        <input
          readOnly
          value={TARGET}
          className="h-6 w-52 bg-[#111520] border border-[#252e42] rounded text-cyan-400 text-[11px] px-2 outline-none font-mono"
        />
        <TbSep />
        <ToolbarButton variant="cyan" onClick={() => alert('Mock: Run All Recon')}>
          ▶ Run All
        </ToolbarButton>
        <ToolbarButton onClick={() => alert('Mock: DNS Enum')}>DNS Enum</ToolbarButton>
        <ToolbarButton onClick={() => alert('Mock: Subdomain Brute')}>
          Subdomain Brute
        </ToolbarButton>
        <ToolbarButton onClick={() => alert('Mock: Google Dork')}>Google Dork</ToolbarButton>
        <ToolbarButton onClick={() => alert('Mock: Shodan')}>Shodan</ToolbarButton>
        <ToolbarButton onClick={() => alert('Mock: HIBP')}>HIBP</ToolbarButton>
        <TbSep />
        <ToolbarButton className="ml-auto" onClick={() => alert('Export JSON')}>
          Export JSON
        </ToolbarButton>
      </Toolbar>
      {renderTabContent()}
    </div>
  );
}
