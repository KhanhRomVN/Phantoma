// src/renderer/src/features/Tool/components/WorkspaceSection/Recon/ReconV2.tsx
// ============================================================================
// RECON V2 — Ghost Protocol Interface
// Aesthetic: Terminal-noir / Tactical OSINT Dashboard
// ============================================================================
import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../shared/lib/utils';

// ============================================================================
// MOCK DATA
// ============================================================================
const TARGET = 'phantom.tech';
const TARGET_IP = '198.51.100.78';
const SCAN_TIME = '2025-06-04T03:47:22Z';

const riskScore = {
  total: 87,
  breakdown: { network: 92, breach: 95, exposure: 78, reputation: 65 },
};

const dnsRecords = {
  A: ['198.51.100.78', '198.51.100.79', '198.51.100.80'],
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
  ],
  NS: ['ns1.digitalocean.com', 'ns2.digitalocean.com', 'ns3.digitalocean.com'],
  SOA: { mname: 'ns1.digitalocean.com', rname: 'hostmaster.phantom.tech', serial: 2025060201 },
  CNAME: { www: 'phantom.tech', mail: 'mailgun.phantom.tech' },
};

const whoisData = {
  domain: TARGET,
  status: 'clientTransferProhibited',
  registrar: { name: 'NameCheap, Inc.', iana_id: 1068, abuse_email: 'abuse@namecheap.com' },
  dates: { created: '2021-08-15', updated: '2025-02-20', expired: '2026-08-15' },
  registrant: {
    name: 'Phantom Security Ltd',
    organization: 'Phantom Security Ltd',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    email: 'admin@phantom.tech',
    phone: '+1.5551234567',
  },
};

const breaches = [
  {
    name: 'Phantom Internal DB 2025',
    date: '2025-01-15',
    accounts: 1250000,
    categories: ['emails', 'passwords', 'ips', 'payment'],
    severity: 'CRITICAL',
    description: 'Misconfigured MongoDB exposed PII, hashed passwords and payment history.',
  },
  {
    name: 'LinkedIn Scrape 2021',
    date: '2021-06-22',
    accounts: 700000000,
    categories: ['emails', 'passwords'],
    severity: 'CRITICAL',
    description: 'Mass scrape of LinkedIn profiles including email/password pairs.',
  },
  {
    name: 'Collection #1 2019',
    date: '2019-01-07',
    accounts: 773000000,
    categories: ['emails', 'passwords'],
    severity: 'HIGH',
    description: 'Aggregate of multiple prior breaches, widely circulated.',
  },
  {
    name: 'Adobe 2013',
    date: '2013-10-04',
    accounts: 152445165,
    categories: ['emails', 'passwords', 'hints'],
    severity: 'MEDIUM',
    description: 'Password hints included, enabling targeted attacks.',
  },
];

const harvestedEmails = [
  {
    email: 'admin@phantom.tech',
    source: 'WHOIS',
    verified: true,
    role: 'Administrator',
    breach: true,
  },
  {
    email: 'security@phantom.tech',
    source: 'GitHub',
    verified: true,
    role: 'Security Team',
    breach: false,
  },
  {
    email: 'john.doe@phantom.tech',
    source: 'LinkedIn',
    verified: true,
    role: 'Backend Engineer',
    breach: true,
  },
  {
    email: 'support@phantom.tech',
    source: 'Twitter',
    verified: false,
    role: 'Support',
    breach: false,
  },
  {
    email: 'contact@phantom.tech',
    source: 'PGP Keyserver',
    verified: true,
    role: 'General',
    breach: false,
  },
  {
    email: 'sales@phantom.tech',
    source: 'Crunchbase',
    verified: false,
    role: 'Sales',
    breach: false,
  },
  {
    email: 'devops@phantom.tech',
    source: 'GitHub commit',
    verified: true,
    role: 'DevOps Lead',
    breach: true,
  },
  {
    email: 'abuse@phantom.tech',
    source: 'WHOIS (registrar)',
    verified: true,
    role: 'Abuse Contact',
    breach: false,
  },
];

const ports = [
  {
    port: 22,
    service: 'SSH',
    product: 'OpenSSH 8.9p1',
    state: 'open',
    risk: 'medium',
    cve: ['CVE-2023-38408'],
  },
  { port: 25, service: 'SMTP', product: 'Postfix 3.6.4', state: 'open', risk: 'low', cve: [] },
  { port: 80, service: 'HTTP', product: 'nginx 1.24.0', state: 'open', risk: 'low', cve: [] },
  {
    port: 443,
    service: 'HTTPS',
    product: 'nginx 1.24.0 + TLS1.3',
    state: 'open',
    risk: 'low',
    cve: [],
  },
  {
    port: 3306,
    service: 'MySQL',
    product: 'MySQL 8.0.33',
    state: 'open',
    risk: 'critical',
    cve: ['CVE-2023-2182'],
  },
  {
    port: 8080,
    service: 'HTTP-ALT',
    product: 'Jenkins 2.401.1',
    state: 'open',
    risk: 'critical',
    cve: ['CVE-2023-27898'],
  },
  {
    port: 8443,
    service: 'HTTPS-ALT',
    product: 'Apache Tomcat 9.0.78',
    state: 'open',
    risk: 'high',
    cve: ['CVE-2023-28708'],
  },
  {
    port: 27017,
    service: 'MongoDB',
    product: 'MongoDB 5.0.14',
    state: 'filtered',
    risk: 'medium',
    cve: [],
  },
  {
    port: 6379,
    service: 'Redis',
    product: 'Redis 7.0.5',
    state: 'open',
    risk: 'critical',
    cve: ['CVE-2022-0543'],
  },
  {
    port: 9200,
    service: 'Elasticsearch',
    product: 'Elastic 8.5.0',
    state: 'open',
    risk: 'high',
    cve: [],
  },
];

const vulns = [
  {
    cve: 'CVE-2023-38408',
    cvss: 9.8,
    severity: 'CRITICAL',
    service: 'OpenSSH',
    desc: 'Remote code execution via ssh-agent forwarding.',
    exploitable: true,
  },
  {
    cve: 'CVE-2023-27898',
    cvss: 8.9,
    severity: 'HIGH',
    service: 'Jenkins',
    desc: 'Auth bypass via crafted HTTP request to API endpoint.',
    exploitable: true,
  },
  {
    cve: 'CVE-2023-2182',
    cvss: 7.5,
    severity: 'HIGH',
    service: 'MySQL',
    desc: 'DoS via specially crafted SELECT query.',
    exploitable: false,
  },
  {
    cve: 'CVE-2023-28708',
    cvss: 7.3,
    severity: 'HIGH',
    service: 'Tomcat',
    desc: 'Session fixation via JSESSIONID cookie manipulation.',
    exploitable: true,
  },
  {
    cve: 'CVE-2022-0543',
    cvss: 10.0,
    severity: 'CRITICAL',
    service: 'Redis',
    desc: 'Lua sandbox escape allowing full RCE on the host.',
    exploitable: true,
  },
];

const subdomains = [
  {
    name: 'admin',
    status: 200,
    risk: 'critical',
    title: 'Admin Dashboard',
    server: 'nginx/1.24.0',
    tech: 'React',
  },
  {
    name: 'api',
    status: 200,
    risk: 'medium',
    title: 'API Gateway',
    server: 'nginx/1.24.0',
    tech: 'Express',
  },
  {
    name: 'jenkins',
    status: 200,
    risk: 'critical',
    title: 'Jenkins CI',
    server: 'Jetty/9.4',
    tech: 'Java',
  },
  {
    name: 'vpn',
    status: 200,
    risk: 'critical',
    title: 'VPN Portal',
    server: 'OpenResty',
    tech: 'Lua',
  },
  { name: 'git', status: 200, risk: 'high', title: 'Gitea', server: 'Go', tech: 'Go' },
  {
    name: 'monitor',
    status: 200,
    risk: 'high',
    title: 'Grafana',
    server: 'Grafana/10.0',
    tech: 'Go',
  },
  {
    name: 'kibana',
    status: 200,
    risk: 'high',
    title: 'Kibana',
    server: 'Kibana/8.5',
    tech: 'Node',
  },
  {
    name: 'registry',
    status: 200,
    risk: 'high',
    title: 'Docker Registry',
    server: 'Go',
    tech: 'Docker',
  },
  {
    name: 'dev',
    status: 403,
    risk: 'medium',
    title: 'Forbidden',
    server: 'nginx/1.24.0',
    tech: '—',
  },
  {
    name: 'backup',
    status: 401,
    risk: 'medium',
    title: 'Auth Required',
    server: 'nginx/1.24.0',
    tech: '—',
  },
  {
    name: 'staging',
    status: 404,
    risk: 'low',
    title: 'Not Found',
    server: 'nginx/1.24.0',
    tech: '—',
  },
  { name: 'mail', status: 301, risk: 'low', title: 'Redirect', server: 'nginx/1.24.0', tech: '—' },
  { name: 'blog', status: 200, risk: 'low', title: 'Blog', server: 'WordPress', tech: 'PHP' },
  { name: 'minio', status: 200, risk: 'high', title: 'MinIO Console', server: 'MinIO', tech: 'Go' },
  {
    name: 'partner',
    status: 200,
    risk: 'medium',
    title: 'Partner Portal',
    server: 'IIS/10.0',
    tech: '.NET',
  },
  { name: 'cdn', status: 200, risk: 'low', title: 'CDN', server: 'cloudflare', tech: '—' },
];

const techStack = {
  webServer: 'nginx 1.24.0',
  backend: 'Node.js 18.17 / Express 4.18',
  frontend: 'React 18.2 + Redux Toolkit',
  database: 'PostgreSQL 14.8 + PostGIS',
  cache: 'Redis 7.0.5',
  search: 'Elasticsearch 8.5.0',
  cdn: 'Cloudflare Enterprise',
  ssl: "Let's Encrypt / TLS 1.3",
  container: 'Docker Compose',
  ci: 'Jenkins 2.401.1',
  monitoring: 'Grafana + Prometheus',
  logging: 'ELK Stack',
};

const cloudAssets = [
  {
    type: 'AWS S3',
    name: 'phantom-backups',
    perm: 'PUBLIC READ',
    risk: 'critical',
    files: ['database.sql.gz', 'customer_emails.csv', 'config.env'],
  },
  {
    type: 'Docker Registry',
    name: 'registry.phantom.tech',
    perm: 'ANON PULL',
    risk: 'critical',
    files: ['phantom/api:latest', 'phantom/web:staging', 'phantom/worker:debug'],
  },
  {
    type: 'GCP Storage',
    name: 'phantom-logs',
    perm: 'auth-read',
    risk: 'medium',
    files: ['access_log_2025-05.txt'],
  },
  {
    type: 'Azure Blob',
    name: 'phantomcdn',
    perm: 'PUBLIC READ',
    risk: 'high',
    files: ['index.html', 'bundle.js.map'],
  },
];

const codeRepos = [
  {
    platform: 'GitHub',
    repo: 'phantom-security/backend',
    secrets: ['AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE', 'JWT_SECRET=s3cr3t!ghost'],
    lastCommit: '2025-06-01',
    stars: 0,
    private: false,
  },
  {
    platform: 'GitHub',
    repo: 'phantom-security/terraform',
    secrets: ['db_password=phantom@2025', 'private_key.pem (RSA 4096)'],
    lastCommit: '2025-05-28',
    stars: 2,
    private: false,
  },
  {
    platform: 'GitLab',
    repo: 'phantom/internal-tools',
    secrets: ['CI_JOB_TOKEN=glptt-abc123', 'SSH_DEPLOY_KEY'],
    lastCommit: '2025-06-02',
    stars: 0,
    private: false,
  },
];

const darkWebLeaks = [
  {
    source: 'Pastebin',
    date: '2025-05-20',
    snippet: 'phantom.tech DB dump — users table: 1.25M rows w/ bcrypt hashes, plaintext emails',
    risk: 'critical',
  },
  {
    source: 'RaidForums (mirror)',
    date: '2025-01-10',
    snippet: 'Selling RDP access to phantom.tech infra — $2500 negotiable',
    risk: 'critical',
  },
  {
    source: 'Telegram (@leakzone)',
    date: '2025-04-01',
    snippet: 'Leaked API keys for phantom-tech AWS + Stripe webhook secret',
    risk: 'high',
  },
  {
    source: 'BreachForums',
    date: '2025-03-15',
    snippet: 'phantom.tech source code zip (backend + terraform) — free share',
    risk: 'critical',
  },
];

const threatIntel = [
  {
    source: 'VirusTotal',
    indicator: TARGET,
    detections: '2/89',
    verdict: 'suspicious',
    detail: 'Flagged by ESET + Kaspersky for phishing campaign artifacts',
  },
  {
    source: 'VirusTotal',
    indicator: TARGET_IP,
    detections: '3/89',
    verdict: 'malicious',
    detail: 'Known C2 communication, associated with RedLine stealer',
  },
  {
    source: 'AlienVault OTX',
    indicator: TARGET,
    detections: '1 pulse',
    verdict: 'suspicious',
    detail: '"Phantom.tech phishing campaign" pulse from Feb 2025',
  },
  {
    source: 'AbuseIPDB',
    indicator: TARGET_IP,
    detections: '78% confidence',
    verdict: 'malicious',
    detail: 'Reported 12 times for SSH brute force + port scanning',
  },
  {
    source: 'Shodan',
    indicator: TARGET_IP,
    detections: '5 vulns',
    verdict: 'high-risk',
    detail: 'Critical services exposed: Redis, MySQL, Jenkins unauthenticated',
  },
];

const httpHeaders = {
  Server: 'nginx/1.24.0',
  'X-Powered-By': 'Express ⚠️ (info leak)',
  'X-Frame-Options': 'DENY ✓',
  'X-Content-Type-Options': 'nosniff ✓',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains ✓',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' ⚠️",
  'Referrer-Policy': 'strict-origin-when-cross-origin ✓',
  'X-XSS-Protection': '1; mode=block (legacy) ⚠️',
  'Set-Cookie': 'sessionId=…; HttpOnly; Secure; SameSite=Strict ✓',
  'CF-Ray': '89abc123def-SJC (Cloudflare)',
};

const googleDorks = [
  {
    type: 'Admin Panels',
    query: `site:${TARGET} intitle:"admin" OR intitle:"login"`,
    results: 12,
    urls: ['admin.phantom.tech', 'dashboard.phantom.tech/login'],
  },
  {
    type: 'Sensitive Files',
    query: `site:${TARGET} filetype:sql OR filetype:log`,
    results: 7,
    urls: ['git.phantom.tech/db_backup.sql', 'api.phantom.tech/.env'],
  },
  {
    type: 'PHP Info',
    query: `site:${TARGET} intitle:"phpinfo()"`,
    results: 1,
    urls: ['test.phantom.tech/info.php'],
  },
  {
    type: 'Git Exposed',
    query: `site:${TARGET} ".git"`,
    results: 2,
    urls: ['git.phantom.tech/.git/config'],
  },
  {
    type: 'Backup Files',
    query: `site:${TARGET} ext:bak | ext:old`,
    results: 3,
    urls: ['backup.phantom.tech/data.old'],
  },
  {
    type: 'Open Redirects',
    query: `site:${TARGET} inurl:redirect= OR inurl:url=`,
    results: 4,
    urls: ['api.phantom.tech/auth?redirect=', 'phantom.tech/go?url='],
  },
];

const certTransparency = [
  {
    id: '12345678',
    loggedAt: '2025-05-20',
    issuer: "Let's Encrypt R3",
    commonName: '*.phantom.tech',
    san: ['phantom.tech', '*.phantom.tech', 'admin.phantom.tech', 'api.phantom.tech'],
    notAfter: '2025-08-18',
  },
  {
    id: '12345679',
    loggedAt: '2025-04-15',
    issuer: 'Google Trust Services GTS CA 1D4',
    commonName: 'phantom.tech',
    san: ['phantom.tech'],
    notAfter: '2025-07-14',
  },
  {
    id: '12345680',
    loggedAt: '2024-12-01',
    issuer: "Let's Encrypt R3",
    commonName: 'vpn.phantom.tech',
    san: ['vpn.phantom.tech'],
    notAfter: '2025-03-01',
  },
];

const waybackSnapshots = [
  {
    date: '2025-05-15',
    url: '/',
    finding: 'New homepage with updated team page — exposes 3 new employee names',
  },
  {
    date: '2024-12-01',
    url: '/admin',
    finding: '⚠️ Admin login exposed publicly (no auth gate) — since fixed',
  },
  {
    date: '2024-10-08',
    url: '/.env',
    finding: '🔴 .env file accessible: DB_PASS, API_KEY, STRIPE_SECRET leaked',
  },
  {
    date: '2024-06-20',
    url: '/backup.zip',
    finding: '🔴 Full site backup downloadable — contained source + credentials',
  },
  {
    date: '2023-01-01',
    url: '/phpinfo.php',
    finding: '⚠️ PHP info page exposing server config, extensions, env vars',
  },
];

const socialIntel = [
  {
    platform: 'LinkedIn',
    name: 'John Doe',
    role: 'Senior Backend Engineer',
    url: 'linkedin.com/in/john-doe-phantom',
    intel: 'Python, Docker, AWS. GitHub: johndoe-dev. Likely manages API infra.',
  },
  {
    platform: 'LinkedIn',
    name: 'Jane Smith',
    role: 'DevOps Lead',
    url: 'linkedin.com/in/jane-smith-phantom',
    intel: 'Jenkins, K8s, Terraform user. Has commit access to terraform repo.',
  },
  {
    platform: 'LinkedIn',
    name: 'Mike Torres',
    role: 'CTO',
    url: 'linkedin.com/in/mike-torres-phantom',
    intel: 'Uses personal email miket@gmail.com for side projects — reuse risk.',
  },
  {
    platform: 'Twitter',
    name: '@phantomdev',
    role: 'Official Dev Account',
    url: 'twitter.com/phantomdev',
    intel: 'Tweets about stack updates. Mentioned Redis migration in Feb 2025.',
  },
  {
    platform: 'GitHub',
    name: 'phantom-security',
    role: 'GitHub Org',
    url: 'github.com/phantom-security',
    intel: '12 members visible. 3 repos public. Commit history reveals infra details.',
  },
];

// ============================================================================
// UTILITY HELPERS
// ============================================================================
const RISK_COLOR: Record<string, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#f5a623',
  low: '#30d158',
  none: '#636366',
};

const RISK_BG: Record<string, string> = {
  critical: 'rgba(255,45,85,0.08)',
  high: 'rgba(255,107,53,0.08)',
  medium: 'rgba(245,166,35,0.08)',
  low: 'rgba(48,209,88,0.08)',
  none: 'rgba(99,99,102,0.06)',
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff6b35',
  MEDIUM: '#f5a623',
  LOW: '#30d158',
};

function RiskPill({ level, children }: { level: string; children?: React.ReactNode }) {
  const c = RISK_COLOR[level.toLowerCase()] ?? '#636366';
  return (
    <span
      style={{ color: c, border: `1px solid ${c}30`, background: `${c}12` }}
      className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm font-mono"
    >
      {children ?? level}
    </span>
  );
}

function StatBox({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 bg-[#0d1017] border border-[#1c2333] rounded">
      <div className="text-[9px] uppercase tracking-[0.1em] text-[#3a4558] font-mono">{label}</div>
      <div
        className="text-[18px] font-bold font-mono leading-none"
        style={{ color: accent ?? '#c8d6f0' }}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-[#3a4558]">{sub}</div>}
    </div>
  );
}

function SectionHeader({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-3 rounded-full" style={{ background: accent ?? '#0af' }} />
      <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#4a5a7a]">
        {children}
      </span>
    </div>
  );
}

function KV({ k, v, vc }: { k: string; v: string; vc?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-[3px] border-b border-[#111827] last:border-0">
      <span className="text-[9.5px] text-[#3a4558] font-mono shrink-0">{k}</span>
      <span className={cn('text-[10px] font-mono text-right break-all', vc ?? 'text-[#8da0c0]')}>
        {v}
      </span>
    </div>
  );
}

// ============================================================================
// SVG CHARTS
// ============================================================================
function RiskRadar({ data }: { data: Record<string, number> }) {
  const keys = Object.keys(data);
  const cx = 80,
    cy = 80,
    r = 60;
  const n = keys.length;
  const pts = keys.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const val = data[keys[i]] / 100;
    return {
      x: cx + Math.cos(angle) * r * val,
      y: cy + Math.sin(angle) * r * val,
      lx: cx + Math.cos(angle) * (r + 14),
      ly: cy + Math.sin(angle) * (r + 14),
    };
  });
  const gridPts = (scale: number) =>
    keys
      .map((_, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
      })
      .join(' ');

  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={gridPts(s)} fill="none" stroke="#1c2333" strokeWidth="0.5" />
      ))}
      {keys.map((_, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="#1c2333"
            strokeWidth="0.5"
          />
        );
      })}
      <polygon
        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(0,170,255,0.12)"
        stroke="#0af"
        strokeWidth="1"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="#0af" />
      ))}
      {pts.map((p, i) => (
        <text
          key={i}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          fill="#4a5a7a"
          fontFamily="monospace"
        >
          {keys[i].toUpperCase()}
        </text>
      ))}
    </svg>
  );
}

function CvssBar({ score, cve }: { score: number; cve: string }) {
  const color =
    score >= 9 ? '#ff2d55' : score >= 7 ? '#ff6b35' : score >= 4 ? '#f5a623' : '#30d158';
  const width = (score / 10) * 100;
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className="text-[9px] font-mono text-[#4a5a7a] w-32 shrink-0">{cve}</span>
      <div className="flex-1 h-[3px] bg-[#111827] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-bold font-mono w-6 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function PortMatrix() {
  return (
    <div className="grid grid-cols-2 gap-1">
      {ports.map((p) => {
        const c = RISK_COLOR[p.risk];
        return (
          <div
            key={p.port}
            className="flex items-center gap-2 p-1.5 rounded border"
            style={{ borderColor: `${c}25`, background: `${c}08` }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: p.state === 'open' ? c : '#636366' }}
            />
            <span className="font-mono text-[10px] font-bold w-10 shrink-0" style={{ color: c }}>
              {p.port}
            </span>
            <span className="text-[9px] text-[#4a5a7a] truncate">{p.service}</span>
            <span className="ml-auto text-[8px] text-[#2a3548] truncate">
              {p.product.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SubdomainTreemap() {
  return (
    <div className="grid grid-cols-4 gap-[3px]">
      {subdomains.map((s) => {
        const c = RISK_COLOR[s.risk];
        return (
          <div
            key={s.name}
            className="rounded p-1.5 flex flex-col gap-0.5 min-h-[44px] cursor-default group"
            style={{ background: `${c}10`, border: `1px solid ${c}25` }}
          >
            <div className="flex items-center justify-between">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              <span className="text-[8px] font-mono text-[#2a3548]">{s.status}</span>
            </div>
            <div className="text-[9.5px] font-mono font-bold truncate" style={{ color: c }}>
              {s.name}
            </div>
            <div className="text-[8px] text-[#2a3548] truncate group-hover:text-[#4a5a7a] transition-colors">
              {s.title}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BreachTimeline() {
  const sorted = [...breaches].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="relative pl-4">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[#1c2333]" />
      {sorted.map((b, i) => (
        <div key={i} className="relative mb-3 last:mb-0">
          <div
            className="absolute -left-[13px] top-1 w-2 h-2 rounded-full border border-current"
            style={{
              color: SEVERITY_COLOR[b.severity],
              background: `${SEVERITY_COLOR[b.severity]}30`,
            }}
          />
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-mono text-[#3a4558]">{b.date}</span>
            <RiskPill level={b.severity.toLowerCase()} />
          </div>
          <div className="text-[10.5px] font-semibold text-[#8da0c0]">{b.name}</div>
          <div className="text-[9.5px] text-[#3a4558] mt-0.5">
            {b.accounts.toLocaleString()} accounts · {b.categories.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 80 ? '#ff2d55' : score >= 60 ? '#ff6b35' : score >= 40 ? '#f5a623' : '#30d158';
  const r = 36,
    circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 88 88" className="w-24 h-24">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#111827" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text
          x="44"
          y="40"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill={color}
          fontFamily="monospace"
        >
          {score}
        </text>
        <text x="44" y="54" textAnchor="middle" fontSize="8" fill="#3a4558" fontFamily="monospace">
          RISK
        </text>
      </svg>
    </div>
  );
}

function HeatBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? '#ff2d55' : value >= 60 ? '#ff6b35' : value >= 40 ? '#f5a623' : '#30d158';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-[#3a4558] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-[5px] bg-[#111827] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-7 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function TabOverview() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10] grid grid-cols-3 gap-2 content-start">
      {/* Top stats row */}
      <div className="col-span-3 grid grid-cols-6 gap-2">
        <StatBox
          label="Open Ports"
          value={ports.filter((p) => p.state === 'open').length}
          sub={`of ${ports.length} scanned`}
          accent="#0af"
        />
        <StatBox
          label="CVEs Found"
          value={vulns.length}
          sub={`${vulns.filter((v) => v.severity === 'CRITICAL').length} critical`}
          accent="#ff2d55"
        />
        <StatBox
          label="Subdomains"
          value={subdomains.length}
          sub={`${subdomains.filter((s) => s.risk === 'critical').length} critical risk`}
          accent="#ff6b35"
        />
        <StatBox
          label="Breaches"
          value={breaches.length}
          sub={`${(breaches.reduce((a, b) => a + b.accounts, 0) / 1e6).toFixed(0)}M records`}
          accent="#f5a623"
        />
        <StatBox
          label="Emails"
          value={harvestedEmails.length}
          sub={`${harvestedEmails.filter((e) => e.breach).length} in breaches`}
          accent="#bf5af2"
        />
        <StatBox
          label="Leaked Secrets"
          value={codeRepos.reduce((a, r) => a + r.secrets.length, 0)}
          sub="in public repos"
          accent="#ff2d55"
        />
      </div>

      {/* Risk score card */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff2d55">Risk Score</SectionHeader>
        <div className="flex items-center gap-3">
          <ScoreGauge score={riskScore.total} />
          <div className="flex-1 space-y-1.5">
            <HeatBar label="Network" value={riskScore.breakdown.network} />
            <HeatBar label="Breach" value={riskScore.breakdown.breach} />
            <HeatBar label="Exposure" value={riskScore.breakdown.exposure} />
            <HeatBar label="Reputation" value={riskScore.breakdown.reputation} />
          </div>
        </div>
      </div>

      {/* Radar */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Attack Surface</SectionHeader>
        <div className="w-full h-40">
          <RiskRadar data={riskScore.breakdown} />
        </div>
      </div>

      {/* Host info */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#30d158">Host Intel</SectionHeader>
        <KV k="Primary IP" v={TARGET_IP} vc="text-[#0af] font-bold" />
        <KV k="ASN" v="AS14061 · DigitalOcean" />
        <KV k="ISP" v="DigitalOcean LLC" />
        <KV k="Location" v="Santa Clara, CA · US" />
        <KV k="Hosting" v="DigitalOcean Cloud (SFO3)" vc="text-[#f5a623]" />
        <KV k="OS" v="Ubuntu 22.04 LTS" />
        <KV k="WAF" v="Cloudflare Enterprise" vc="text-[#ff6b35]" />
        <KV k="SSL" v="TLS 1.3 / Let's Encrypt" vc="text-[#30d158]" />
        <KV k="Scan Time" v={SCAN_TIME} />
      </div>

      {/* Top CVEs */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
        <SectionHeader accent="#ff2d55">Critical Vulnerabilities</SectionHeader>
        <div className="space-y-0.5">
          {vulns.map((v) => (
            <CvssBar key={v.cve} score={v.cvss} cve={v.cve} />
          ))}
        </div>
      </div>

      {/* Subdomain treemap */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-3">
        <SectionHeader accent="#bf5af2">
          Subdomain Map ({subdomains.length} discovered)
        </SectionHeader>
        <SubdomainTreemap />
      </div>

      {/* Tech stack */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-3">
        <SectionHeader accent="#0af">Technology Fingerprint</SectionHeader>
        <div className="grid grid-cols-4 gap-x-4">
          {Object.entries(techStack).map(([k, v]) => (
            <KV key={k} k={k} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TabPorts() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Open Port Matrix</SectionHeader>
          <PortMatrix />
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Exploitable CVEs</SectionHeader>
          <div className="space-y-2">
            {vulns.map((v, i) => (
              <div
                key={i}
                className="border rounded p-2"
                style={{
                  borderColor: `${SEVERITY_COLOR[v.severity]}25`,
                  background: `${SEVERITY_COLOR[v.severity]}06`,
                }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{ color: SEVERITY_COLOR[v.severity] }}
                  >
                    {v.cve}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {v.exploitable && (
                      <span className="text-[8px] font-bold text-[#ff2d55] bg-[#ff2d5515] border border-[#ff2d5530] px-1 rounded font-mono">
                        POC AVAIL
                      </span>
                    )}
                    <RiskPill level={v.severity.toLowerCase()} />
                  </div>
                </div>
                <div className="text-[9px] text-[#4a5a7a]">
                  Service: {v.service} · CVSS {v.cvss}
                </div>
                <div className="text-[9.5px] text-[#6a7a9a] mt-0.5">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff6b35">Port Detail Table</SectionHeader>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-[#1c2333]">
                {['Port', 'Service', 'Product', 'State', 'Risk', 'CVEs'].map((h) => (
                  <th
                    key={h}
                    className="text-left p-1.5 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ports.map((p, i) => (
                <tr
                  key={i}
                  className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors"
                >
                  <td className="p-1.5 font-bold" style={{ color: RISK_COLOR[p.risk] }}>
                    {p.port}
                  </td>
                  <td className="p-1.5 text-[#8da0c0]">{p.service}</td>
                  <td className="p-1.5 text-[#4a5a7a]">{p.product}</td>
                  <td className="p-1.5">
                    <span className={p.state === 'open' ? 'text-[#30d158]' : 'text-[#3a4558]'}>
                      {p.state}
                    </span>
                  </td>
                  <td className="p-1.5">
                    <RiskPill level={p.risk} />
                  </td>
                  <td className="p-1.5 text-[#ff2d55]">{p.cve.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabDNS() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">A / AAAA Records</SectionHeader>
          {dnsRecords.A.map((ip, i) => (
            <KV key={i} k={`A[${i}]`} v={ip} vc="text-[#0af]" />
          ))}
          {dnsRecords.AAAA.map((ip, i) => (
            <KV key={i} k={`AAAA[${i}]`} v={ip} vc="text-[#0af]" />
          ))}
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">MX Records</SectionHeader>
          {dnsRecords.MX.map((mx, i) => (
            <KV key={i} k={`Priority ${mx.priority}`} v={mx.exchange} />
          ))}
          <div className="mt-2 pt-2 border-t border-[#1c2333]">
            <SectionHeader accent="#30d158">NS / SOA</SectionHeader>
            {dnsRecords.NS.map((ns, i) => (
              <KV key={i} k={`NS[${i}]`} v={ns} />
            ))}
            <KV k="SOA Primary" v={dnsRecords.SOA.mname} />
            <KV k="SOA rname" v={dnsRecords.SOA.rname} />
            <KV k="Serial" v={dnsRecords.SOA.serial.toString()} />
          </div>
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#f5a623">TXT Records</SectionHeader>
          <div className="space-y-1">
            {dnsRecords.TXT.map((txt, i) => (
              <div
                key={i}
                className="font-mono text-[9.5px] text-[#6a7a9a] bg-[#060810] border border-[#111827] rounded p-1.5 break-all"
              >
                "{txt}"
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">DNS Security Posture</SectionHeader>
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: 'DNSSEC', v: 'Not Signed', bad: true },
              { k: 'SPF', v: '~all (softfail)', bad: true },
              { k: 'DMARC', v: 'p=reject ✓', bad: false },
              { k: 'CAA', v: 'Not configured', bad: true },
              { k: 'Zone Transfer', v: 'Blocked ✓', bad: false },
              { k: 'DKIM', v: 'Not found', bad: true },
              { k: 'NSEC3', v: 'Disabled', bad: true },
              { k: 'MTA-STS', v: 'Not configured', bad: true },
            ].map((item) => (
              <div
                key={item.k}
                className="p-2 rounded border"
                style={{
                  borderColor: item.bad ? '#ff2d5525' : '#30d15825',
                  background: item.bad ? '#ff2d5508' : '#30d15808',
                }}
              >
                <div className="text-[8px] uppercase tracking-wider text-[#2a3548] font-mono">
                  {item.k}
                </div>
                <div
                  className="text-[10px] font-mono mt-0.5"
                  style={{ color: item.bad ? '#ff6b35' : '#30d158' }}
                >
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBreach() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Breach Timeline</SectionHeader>
          <BreachTimeline />
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Aggregate Stats</SectionHeader>
          <StatBox
            label="Total Records"
            value={`${(breaches.reduce((a, b) => a + b.accounts, 0) / 1e6).toFixed(0)}M`}
            sub="across all breaches"
            accent="#ff2d55"
          />
          <div className="mt-2 space-y-1">
            {['emails', 'passwords', 'ips', 'payment', 'hints'].map((cat) => {
              const count = breaches.filter((b) => b.categories.includes(cat)).length;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[#3a4558] w-20">{cat}</span>
                  <div className="flex-1 h-1.5 bg-[#111827] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff2d55] rounded-full"
                      style={{ width: `${(count / breaches.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-[#4a5a7a] font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-span-3 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Email Exposure Grid</SectionHeader>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-[#1c2333]">
                {['Email', 'Role', 'Source', 'Verified', 'In Breach'].map((h) => (
                  <th
                    key={h}
                    className="text-left p-1.5 text-[#2a3548] font-normal text-[9px] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {harvestedEmails.map((e, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-[#0d1017] hover:bg-[#111827] transition-colors',
                    e.breach && 'bg-[#ff2d550a]',
                  )}
                >
                  <td className="p-1.5 text-[#0af]">{e.email}</td>
                  <td className="p-1.5 text-[#8da0c0]">{e.role}</td>
                  <td className="p-1.5 text-[#4a5a7a]">{e.source}</td>
                  <td className="p-1.5">
                    {e.verified ? (
                      <span className="text-[#30d158]">✓ YES</span>
                    ) : (
                      <span className="text-[#3a4558]">UNVERIFIED</span>
                    )}
                  </td>
                  <td className="p-1.5">
                    {e.breach ? (
                      <span className="text-[#ff2d55] font-bold">🔴 FOUND</span>
                    ) : (
                      <span className="text-[#3a4558]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabExposure() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Cloud Assets */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Cloud Asset Exposure</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {cloudAssets.map((a, i) => (
              <div
                key={i}
                className="border rounded p-2.5"
                style={{
                  borderColor: `${RISK_COLOR[a.risk]}30`,
                  background: `${RISK_COLOR[a.risk]}06`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px] font-bold font-mono"
                    style={{ color: RISK_COLOR[a.risk] }}
                  >
                    {a.type}
                  </span>
                  <RiskPill level={a.risk} />
                </div>
                <div className="text-[9px] font-mono text-[#4a5a7a] mb-1">{a.name}</div>
                <div className="text-[9px] font-bold text-[#ff2d55] font-mono mb-1">{a.perm}</div>
                <div className="space-y-0.5">
                  {a.files.map((f, fi) => (
                    <div
                      key={fi}
                      className="text-[8.5px] font-mono text-[#3a4558] flex items-center gap-1"
                    >
                      <span className="text-[#ff2d55]">›</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Repos */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff6b35">Leaked Secrets in Repos</SectionHeader>
          {codeRepos.map((repo, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#0af]">{repo.repo}</span>
                <span className="text-[8px] text-[#3a4558] font-mono">
                  {repo.platform} · {repo.lastCommit}
                </span>
              </div>
              {repo.secrets.map((s, si) => (
                <div
                  key={si}
                  className="text-[9px] font-mono text-[#ff2d55] bg-[#ff2d5508] border border-[#ff2d5520] rounded px-2 py-1 mb-0.5 truncate"
                >
                  {s}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Dark Web */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Dark Web & Paste Leaks</SectionHeader>
          {darkWebLeaks.map((l, i) => (
            <div
              key={i}
              className="mb-2 last:mb-0 border rounded p-2"
              style={{
                borderColor: `${RISK_COLOR[l.risk]}25`,
                background: `${RISK_COLOR[l.risk]}05`,
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: RISK_COLOR[l.risk] }}
                >
                  {l.source}
                </span>
                <span className="text-[8px] text-[#2a3548] font-mono">{l.date}</span>
              </div>
              <div className="text-[9px] text-[#6a7a9a] leading-relaxed">{l.snippet}</div>
            </div>
          ))}
        </div>

        {/* Google Dorks */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Google Dork Results</SectionHeader>
          <div className="grid grid-cols-3 gap-2">
            {googleDorks.map((d, i) => (
              <div key={i} className="bg-[#060810] border border-[#1c2333] rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#f5a623]">{d.type}</span>
                  <span className="text-[9px] font-mono text-[#f5a623] bg-[#f5a62315] px-1 rounded">
                    {d.results} hits
                  </span>
                </div>
                <div className="text-[8px] font-mono text-[#2a3548] break-all mb-1">{d.query}</div>
                {d.urls.map((u, ui) => (
                  <div key={ui} className="text-[8.5px] text-[#0af] truncate">
                    › {u}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Wayback */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Wayback Machine Findings</SectionHeader>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-[#1c2333]">
                {['Date', 'URL Path', 'Security Finding'].map((h) => (
                  <th
                    key={h}
                    className="text-left p-1.5 text-[#2a3548] text-[9px] uppercase tracking-wider font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waybackSnapshots.map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors"
                >
                  <td className="p-1.5 text-[#3a4558]">{s.date}</td>
                  <td className="p-1.5 text-[#0af]">{s.url}</td>
                  <td className="p-1.5 text-[#8da0c0]">{s.finding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabIntel() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Threat Intel */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Threat Intelligence Feeds</SectionHeader>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-[#1c2333]">
                {['Source', 'Indicator', 'Detections', 'Verdict', 'Detail'].map((h) => (
                  <th
                    key={h}
                    className="text-left p-1.5 text-[#2a3548] text-[9px] uppercase tracking-wider font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threatIntel.map((ti, i) => {
                const vc =
                  ti.verdict === 'malicious'
                    ? '#ff2d55'
                    : ti.verdict === 'suspicious'
                      ? '#f5a623'
                      : '#ff6b35';
                return (
                  <tr
                    key={i}
                    className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors"
                  >
                    <td className="p-1.5 text-[#0af]">{ti.source}</td>
                    <td className="p-1.5 text-[#8da0c0]">{ti.indicator}</td>
                    <td className="p-1.5 font-bold" style={{ color: vc }}>
                      {ti.detections}
                    </td>
                    <td className="p-1.5">
                      <span className="uppercase font-bold text-[9px]" style={{ color: vc }}>
                        {ti.verdict}
                      </span>
                    </td>
                    <td className="p-1.5 text-[#4a5a7a] max-w-xs truncate">{ti.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Social Intel */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Social Intelligence (SOCMINT)</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {socialIntel.map((s, i) => (
              <div key={i} className="bg-[#060810] border border-[#1c2333] rounded p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono"
                    style={{
                      background: '#bf5af215',
                      color: '#bf5af2',
                      border: '1px solid #bf5af230',
                    }}
                  >
                    {s.platform}
                  </span>
                  <span className="text-[10px] font-semibold text-[#8da0c0]">{s.name}</span>
                </div>
                <div className="text-[9px] text-[#3a4558] font-mono mb-1">{s.role}</div>
                <div className="text-[9px] text-[#6a7a9a] mb-1">{s.intel}</div>
                <div className="text-[8px] text-[#2a3548] font-mono">{s.url}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate Transparency */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Certificate Transparency Log</SectionHeader>
          {certTransparency.map((cert, i) => (
            <div
              key={i}
              className="mb-2 last:mb-0 bg-[#060810] border border-[#1c2333] rounded p-2.5"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold text-[#0af]">
                  {cert.commonName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#2a3548] font-mono">
                    logged {cert.loggedAt}
                  </span>
                  <span className="text-[8px] text-[#2a3548] font-mono">
                    expires {cert.notAfter}
                  </span>
                </div>
              </div>
              <div className="text-[9px] text-[#3a4558] mb-1">{cert.issuer}</div>
              <div className="flex flex-wrap gap-1">
                {cert.san.map((s) => (
                  <span
                    key={s}
                    className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#0af10] border border-[#0af20] text-[#0af]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* HTTP Headers */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">HTTP Response Headers</SectionHeader>
          <div className="grid grid-cols-2 gap-x-4">
            {Object.entries(httpHeaders).map(([k, v]) => {
              const good = v.includes('✓'),
                bad = v.includes('⚠️');
              return (
                <KV
                  key={k}
                  k={k}
                  v={v}
                  vc={good ? 'text-[#30d158]' : bad ? 'text-[#f5a623]' : 'text-[#6a7a9a]'}
                />
              );
            })}
          </div>
        </div>

        {/* WHOIS */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">WHOIS Registration</SectionHeader>
          <KV k="Domain" v={whoisData.domain} vc="text-[#0af]" />
          <KV k="Status" v={whoisData.status} />
          <KV k="Registrar" v={whoisData.registrar.name} />
          <KV k="Created" v={whoisData.dates.created} />
          <KV k="Updated" v={whoisData.dates.updated} />
          <KV k="Expires" v={whoisData.dates.expired} vc="text-[#f5a623]" />
          <KV k="Registrant" v={whoisData.registrant.name} />
          <KV k="Org" v={whoisData.registrant.organization} />
          <KV
            k="Location"
            v={`${whoisData.registrant.city}, ${whoisData.registrant.state}, ${whoisData.registrant.country}`}
          />
          <KV k="Email" v={whoisData.registrant.email} vc="text-[#ff6b35]" />
          <KV k="Phone" v={whoisData.registrant.phone} />
        </div>

        {/* Robots & Sitemap */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Robots.txt / Sitemap</SectionHeader>
          <div className="mb-3">
            <div className="text-[8.5px] uppercase tracking-wider text-[#2a3548] font-mono mb-1">
              Disallowed Paths
            </div>
            {['/admin', '/api/private', '/backup', '/jenkins', '/internal'].map((p) => (
              <div
                key={p}
                className="text-[9px] font-mono text-[#ff6b35] flex items-center gap-1 mb-0.5"
              >
                <span className="text-[#ff2d55]">✗</span> {p}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-wider text-[#2a3548] font-mono mb-1">
              Sitemap URLs
            </div>
            {['/', 'about', 'contact', 'blog', 'privacy', 'terms', 'admin/login', 'api/docs'].map(
              (p) => (
                <div
                  key={p}
                  className="text-[9px] font-mono text-[#4a5a7a] flex items-center gap-1 mb-0.5"
                >
                  <span className="text-[#30d158]">›</span> phantom.tech/{p}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TERMINAL LOG (animated effect)
// ============================================================================
const LOG_LINES = [
  '[+] Resolving DNS: phantom.tech → 198.51.100.78',
  '[+] WHOIS lookup complete. Registrar: NameCheap',
  '[+] Subdomain brute-force: 16 found (4 critical)',
  '[+] Port scan (nmap -sV): 10 ports identified',
  '[!] CRITICAL: Port 3306 (MySQL) exposed to 0.0.0.0',
  '[!] CRITICAL: Port 6379 (Redis) no auth — CVE-2022-0543 (CVSS 10.0)',
  '[!] CRITICAL: Jenkins 2.401.1 — auth bypass CVE-2023-27898',
  '[+] Google dorks: 29 indexed results found',
  '[!] S3 bucket phantom-backups: PUBLIC READ — customer_emails.csv exposed',
  '[!] GitHub: phantom-security/backend — AWS_ACCESS_KEY_ID leaked in commit history',
  '[!] Dark web: RDP access to phantom.tech infra for sale ($2500)',
  '[+] Email harvest: 8 addresses found, 3 confirmed in breach data',
  '[+] SSL: TLS 1.3, no critical misconfigs in cert chain',
  '[+] WAF: Cloudflare Enterprise detected',
  '[*] Scan complete. Risk score: 87/100 (CRITICAL)',
];

function TerminalLog() {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cursor >= LOG_LINES.length) return;
    const t = setTimeout(
      () => {
        setLines((prev) => [...prev, LOG_LINES[cursor]]);
        setCursor((c) => c + 1);
      },
      120 + Math.random() * 100,
    );
    return () => clearTimeout(t);
  }, [cursor]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-3 bg-[#040608] font-mono text-[10px] leading-relaxed"
    >
      <div className="text-[#2a3548] mb-2">
        ghost-recon v2.0.0 — target: {TARGET} — {SCAN_TIME}
      </div>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'mb-0.5',
            line.startsWith('[!]')
              ? 'text-[#ff2d55]'
              : line.startsWith('[*]')
                ? 'text-[#f5a623]'
                : 'text-[#30d158]',
          )}
        >
          {line}
        </div>
      ))}
      {cursor < LOG_LINES.length && <span className="text-[#30d158] animate-pulse">█</span>}
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
const TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'ports', label: 'Ports & CVEs', accent: '#ff2d55' },
  { id: 'dns', label: 'DNS', accent: '#30d158' },
  { id: 'breach', label: 'Breach / Email', accent: '#f5a623' },
  { id: 'exposure', label: 'Exposure', accent: '#ff6b35' },
  { id: 'intel', label: 'WHOIS / TI / Certs', accent: '#bf5af2' },
  { id: 'terminal', label: 'Scan Log', accent: '#30d158' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function Recon() {
  const [active, setActive] = useState<TabId>('overview');

  const renderContent = () => {
    switch (active) {
      case 'overview':
        return <TabOverview />;
      case 'ports':
        return <TabPorts />;
      case 'dns':
        return <TabDNS />;
      case 'breach':
        return <TabBreach />;
      case 'exposure':
        return <TabExposure />;
      case 'intel':
        return <TabIntel />;
      case 'terminal':
        return <TerminalLog />;
      default:
        return null;
    }
  };

  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-[#080b10]"
      style={{ fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-0 px-3 h-[34px] bg-[#060810] border-b border-[#1c2333] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'h-full px-3 text-[9.5px] uppercase tracking-[0.1em] font-bold transition-all relative whitespace-nowrap',
              active === tab.id ? 'text-[#c8d6f0]' : 'text-[#2a3548] hover:text-[#4a5a7a]',
            )}
          >
            {tab.label}
            {active === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: activeTab.accent }}
              />
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
            <span className="text-[9px] text-[#2a3548] font-mono">RISK 87/100</span>
          </div>
          <div className="w-px h-3 bg-[#1c2333]" />
          <input
            readOnly
            value={TARGET}
            className="h-5 w-36 bg-[#0d1017] border border-[#1c2333] rounded text-[#0af] text-[9.5px] px-2 outline-none font-mono"
          />
          <button className="h-5 px-2.5 bg-[#ff2d5515] border border-[#ff2d5530] text-[#ff2d55] text-[9px] font-bold uppercase tracking-wider rounded font-mono hover:bg-[#ff2d5525] transition-colors">
            ▶ Run
          </button>
          <button className="h-5 px-2 bg-[#1c2333] border border-[#2a3548] text-[#4a5a7a] text-[9px] rounded font-mono hover:text-[#8da0c0] transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
