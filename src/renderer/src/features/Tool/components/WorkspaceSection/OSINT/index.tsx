// ============================================================================
// OSINT — Full module UI + Mock Data
// Covers: People, Social, Code, Breach, WHOIS/DNS/Cert, IoT/Shodan, Geo/Phone
// ============================================================================
import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../shared/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & TYPES
// ─────────────────────────────────────────────────────────────────────────────
const FONT = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

type OsintMode = 'domain' | 'email' | 'username' | 'ip' | 'phone' | 'person';

const MODES: { id: OsintMode; label: string; icon: string; placeholder: string; accent: string }[] =
  [
    { id: 'domain', label: 'Domain', icon: '⬡', placeholder: 'phantom.tech', accent: '#0af' },
    {
      id: 'email',
      label: 'Email',
      icon: '✉',
      placeholder: 'admin@phantom.tech',
      accent: '#30d158',
    },
    { id: 'username', label: 'Username', icon: '◈', placeholder: 'phantom_sec', accent: '#bf5af2' },
    { id: 'ip', label: 'IP / ASN', icon: '⬢', placeholder: '198.51.100.78', accent: '#ff6b35' },
    { id: 'phone', label: 'Phone', icon: '◎', placeholder: '+1 (555) 123-4567', accent: '#f5a623' },
    {
      id: 'person',
      label: 'Person',
      icon: '⬟',
      placeholder: 'John Doe, San Francisco',
      accent: '#ff2d55',
    },
  ];

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const TARGET_QUERY = 'phantom.tech';

const identityGraph = {
  seed: 'admin@phantom.tech',
  nodes: [
    { id: 'seed', type: 'email', label: 'admin@phantom.tech', risk: 'critical' },
    { id: 'n1', type: 'person', label: 'John Doe', risk: 'high' },
    { id: 'n2', type: 'username', label: 'johndoe_dev', risk: 'medium' },
    { id: 'n3', type: 'username', label: 'jdoe1987', risk: 'medium' },
    { id: 'n4', type: 'domain', label: 'johndoe.io', risk: 'high' },
    { id: 'n5', type: 'phone', label: '+1 (555) 123-4567', risk: 'high' },
    { id: 'n6', type: 'social', label: 'GitHub: johndoe-dev', risk: 'medium' },
    { id: 'n7', type: 'social', label: 'LinkedIn: john-doe-phan', risk: 'low' },
    { id: 'n8', type: 'breach', label: 'LinkedIn 2021 Breach', risk: 'critical' },
    { id: 'n9', type: 'ip', label: '198.51.100.78', risk: 'high' },
  ],
  edges: [
    ['seed', 'n1'],
    ['seed', 'n8'],
    ['n1', 'n2'],
    ['n1', 'n3'],
    ['n1', 'n4'],
    ['n1', 'n5'],
    ['n2', 'n6'],
    ['n1', 'n7'],
    ['n4', 'n9'],
    ['seed', 'n9'],
  ],
};

const socialProfiles = [
  {
    platform: 'GitHub',
    handle: 'johndoe-dev',
    url: 'github.com/johndoe-dev',
    followers: 847,
    repos: 34,
    status: 'verified',
    avatar: '◆',
    lastSeen: '2025-06-01',
    leak: true,
    detail: '34 repos · 3 with hardcoded AWS keys in commit history',
  },
  {
    platform: 'LinkedIn',
    handle: 'john-doe-phantom',
    url: 'linkedin.com/in/john-doe-phan',
    followers: 1203,
    repos: 0,
    status: 'verified',
    avatar: '◈',
    lastSeen: '2025-05-30',
    leak: false,
    detail: 'Senior Backend Engineer @ Phantom Security · Python, Docker, AWS',
  },
  {
    platform: 'Twitter/X',
    handle: '@phantomjohn',
    url: 'x.com/phantomjohn',
    followers: 523,
    repos: 0,
    status: 'verified',
    avatar: '◉',
    lastSeen: '2025-05-28',
    leak: false,
    detail: 'Mentioned Redis 7 migration in Feb 2025. Discusses infra stack publicly',
  },
  {
    platform: 'Reddit',
    handle: 'u/jdoe_ops',
    url: 'reddit.com/u/jdoe_ops',
    followers: 91,
    repos: 0,
    status: 'probable',
    avatar: '◎',
    lastSeen: '2025-04-10',
    leak: false,
    detail: 'Posted in r/devops, r/selfhosted. Confirmed use of Proxmox, k3s',
  },
  {
    platform: 'HackerNews',
    handle: 'johndoe1987',
    url: 'news.ycombinator.com/user?id=johndoe1987',
    followers: 0,
    repos: 0,
    status: 'probable',
    avatar: '◇',
    lastSeen: '2025-03-22',
    leak: false,
    detail: 'Upvotes posts about observability and Kubernetes networking',
  },
  {
    platform: 'Keybase',
    handle: 'jdoe_dev',
    url: 'keybase.io/jdoe_dev',
    followers: 0,
    repos: 0,
    status: 'verified',
    avatar: '⬡',
    lastSeen: '2024-11-14',
    leak: false,
    detail: 'PGP key: 4096-bit RSA. Linked to johndoe.io and GitHub account',
  },
  {
    platform: 'Telegram',
    handle: '@phantom_jd',
    url: 't.me/phantom_jd',
    followers: 0,
    repos: 0,
    status: 'probable',
    avatar: '⬢',
    lastSeen: '2025-01-05',
    leak: true,
    detail: 'Member of 4 hacker/devops groups. Phone number partially exposed',
  },
  {
    platform: 'Stack Overflow',
    handle: 'john-doe-4821',
    url: 'stackoverflow.com/users/4821',
    followers: 0,
    repos: 0,
    status: 'verified',
    avatar: '⬟',
    lastSeen: '2025-02-18',
    leak: false,
    detail: 'Top contributor: Docker, Node.js. Reveals backend architecture details',
  },
];

const breachRecords = [
  {
    source: 'Phantom Internal DB',
    date: '2025-01-15',
    email: 'admin@phantom.tech',
    password: '$2b$12$K8Fge…',
    hash: 'bcrypt',
    plain: null,
    ip: '198.51.100.78',
    extra: ['payment_history', 'api_key_hash'],
    severity: 'CRITICAL',
  },
  {
    source: 'LinkedIn 2021',
    date: '2021-06-22',
    email: 'john.doe@gmail.com',
    password: '5f4dcc3b5a…',
    hash: 'MD5',
    plain: 'password123',
    ip: null,
    extra: ['full_name', 'company', 'phone'],
    severity: 'CRITICAL',
  },
  {
    source: 'Adobe 2013',
    date: '2013-10-04',
    email: 'johndoe@gmail.com',
    password: 'ySN9Tbgt…',
    hash: 'DES-ECB',
    plain: 'adobe123!',
    ip: null,
    extra: ['password_hint: "my fav color"'],
    severity: 'HIGH',
  },
  {
    source: 'Collection #1 2019',
    date: '2019-01-07',
    email: 'jdoe1987@yahoo.com',
    password: 'a94a8fe5ccb…',
    hash: 'SHA1',
    plain: 'test',
    ip: null,
    extra: ['dob: 1987-03-12'],
    severity: 'HIGH',
  },
  {
    source: 'Dropbox 2012',
    date: '2012-07-01',
    email: 'john@phantom.tech',
    password: '8cb2237d09…',
    hash: 'SHA256',
    plain: null,
    ip: null,
    extra: ['file_list_metadata'],
    severity: 'MEDIUM',
  },
  {
    source: 'MySpace 2008',
    date: '2008-06-01',
    email: 'johndoe@hotmail.com',
    password: '5baa61e4c9…',
    hash: 'SHA1',
    plain: 'letmein',
    ip: null,
    extra: ['display_name: "j0hn d0e"', 'birth_year: 1987'],
    severity: 'LOW',
  },
];

const codeLeaks = [
  {
    platform: 'GitHub',
    repo: 'phantom-security/backend',
    file: '.env',
    line: 12,
    secret: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
    type: 'AWS Key',
    severity: 'CRITICAL',
    commit: 'a3f9d12',
    date: '2025-06-01',
  },
  {
    platform: 'GitHub',
    repo: 'phantom-security/backend',
    file: 'config/auth.js',
    line: 47,
    secret: 'JWT_SECRET=s3cr3t!ghost_2025',
    type: 'JWT Secret',
    severity: 'CRITICAL',
    commit: 'a3f9d12',
    date: '2025-06-01',
  },
  {
    platform: 'GitHub',
    repo: 'phantom-security/terraform',
    file: 'variables.tf',
    line: 23,
    secret: 'db_password = "phantom@2025"',
    type: 'DB Password',
    severity: 'CRITICAL',
    commit: 'b8e2c55',
    date: '2025-05-28',
  },
  {
    platform: 'GitHub',
    repo: 'phantom-security/terraform',
    file: 'keys/prod.pem',
    line: 1,
    secret: '-----BEGIN RSA PRIVATE KEY----- (4096-bit)',
    type: 'SSH Private Key',
    severity: 'CRITICAL',
    commit: 'b8e2c55',
    date: '2025-05-28',
  },
  {
    platform: 'GitLab',
    repo: 'phantom/internal-tools',
    file: '.gitlab-ci.yml',
    line: 8,
    secret: 'CI_JOB_TOKEN=glptt-abc123def456',
    type: 'GitLab Token',
    severity: 'HIGH',
    commit: 'c1d4f88',
    date: '2025-06-02',
  },
  {
    platform: 'GitLab',
    repo: 'phantom/internal-tools',
    file: 'deploy/ssh_config',
    line: 3,
    secret: 'SSH_DEPLOY_KEY (RSA 2048)',
    type: 'SSH Deploy Key',
    severity: 'HIGH',
    commit: 'c1d4f88',
    date: '2025-06-02',
  },
  {
    platform: 'Pastebin',
    repo: 'anon paste #8f3a2',
    file: 'paste',
    line: 1,
    secret: 'STRIPE_WEBHOOK_SECRET=whsec_phantom2025abc',
    type: 'Stripe Secret',
    severity: 'CRITICAL',
    commit: '—',
    date: '2025-04-01',
  },
  {
    platform: 'GitHub',
    repo: 'phantom-security/backend',
    file: 'src/db/connection.ts',
    line: 6,
    secret: 'DATABASE_URL=postgres://admin:phantom@prod-db…',
    type: 'DB Connection',
    severity: 'CRITICAL',
    commit: 'e9f3a01',
    date: '2025-03-15',
  },
];

const metadataFindings = [
  {
    type: 'EXIF / Image',
    file: 'team-photo-2025.jpg',
    finding: 'GPS: 37.7749° N, 122.4194° W (Phantom HQ)',
    tool: 'ExifTool',
    risk: 'high',
  },
  {
    type: 'EXIF / Image',
    file: 'server-rack-jan25.png',
    finding: 'Device: iPhone 15 Pro · Serial: F2LQ3XXXXXXXX',
    tool: 'ExifTool',
    risk: 'medium',
  },
  {
    type: 'PDF Metadata',
    file: 'Q1-2025-report.pdf',
    finding: 'Author: Jane Smith · Company: Phantom Security Ltd',
    tool: 'pdfinfo',
    risk: 'medium',
  },
  {
    type: 'PDF Metadata',
    file: 'pentest-scope.pdf',
    finding: 'Creator: LibreOffice 7.6 · Last modified: admin',
    tool: 'pdfinfo',
    risk: 'high',
  },
  {
    type: 'DOCX Hidden',
    file: 'employee-handbook.docx',
    finding: 'Tracked changes reveal internal policy debates',
    tool: 'docx2txt',
    risk: 'medium',
  },
  {
    type: 'Git History',
    file: 'backend/.git/log',
    finding: '847 commits · 12 devs · avg push: 09:00–11:00 UTC',
    tool: 'git log',
    risk: 'low',
  },
  {
    type: 'JS Source Map',
    file: 'bundle.js.map (Azure CDN)',
    finding: 'Full React src exposed: /src/admin/AuthBypass.tsx',
    tool: 'source-map',
    risk: 'critical',
  },
  {
    type: 'HTML Comment',
    file: 'admin.phantom.tech/login',
    finding: '<!-- TODO: remove backdoor /admin/dev-access -->',
    tool: 'curl/grep',
    risk: 'critical',
  },
];

const geoPhoneData = {
  ip: {
    address: '198.51.100.78',
    country: 'United States',
    region: 'California',
    city: 'Santa Clara',
    isp: 'DigitalOcean LLC',
    asn: 'AS14061',
    lat: 37.3541,
    lon: -121.9552,
    timezone: 'America/Los_Angeles',
    proxy: false,
    vpn: false,
    tor: false,
    datacenter: true,
    abuse_score: 78,
    tags: ['datacenter', 'scanner', 'brute-force'],
  },
  phone: {
    number: '+1 (555) 123-4567',
    carrier: 'T-Mobile USA',
    type: 'mobile',
    country: 'United States',
    region: 'California',
    ported: false,
    voip: false,
    whatsapp: true,
    signal: true,
    telegram: true,
    disposable: false,
    spam_score: 22,
  },
};

const iotAssets = [
  {
    ip: '198.51.100.78',
    port: 9200,
    product: 'Elasticsearch 8.5.0',
    org: 'DigitalOcean',
    country: 'US',
    vuln: 'Anon access — 2.3GB index',
    cve: 'CVE-2021-22145',
    risk: 'critical',
    banner:
      'HTTP/1.1 200 OK\nContent-Type: application/json\n{"name":"phantom-search","cluster_name":"phantom","tagline":"You Know, for Search"}',
  },
  {
    ip: '198.51.100.78',
    port: 6379,
    product: 'Redis 7.0.5',
    org: 'DigitalOcean',
    country: 'US',
    vuln: 'No-auth, Lua RCE possible',
    cve: 'CVE-2022-0543',
    risk: 'critical',
    banner:
      '+PONG\r\n# Server\nredis_version:7.0.5\nconfig_file:/etc/redis/redis.conf\nbound:0.0.0.0',
  },
  {
    ip: '198.51.100.78',
    port: 8080,
    product: 'Jenkins 2.401.1',
    org: 'DigitalOcean',
    country: 'US',
    vuln: 'Auth bypass via /script RCE',
    cve: 'CVE-2023-27898',
    risk: 'critical',
    banner:
      'HTTP/1.1 403 Forbidden\nX-Jenkins: 2.401.1\nX-Jenkins-Session: abc123\nX-Hudson: 1.395',
  },
  {
    ip: '198.51.100.78',
    port: 5601,
    product: 'Kibana 8.5.0',
    org: 'DigitalOcean',
    country: 'US',
    vuln: 'Internal network dashboards exposed',
    cve: null,
    risk: 'high',
    banner: 'HTTP/1.1 200 OK\nkbn-name: kibana\nkbn-version: 8.5.0',
  },
  {
    ip: '198.51.100.78',
    port: 2375,
    product: 'Docker API',
    org: 'DigitalOcean',
    country: 'US',
    vuln: 'Unauth Docker socket — full host RCE',
    cve: 'CVE-2019-5736',
    risk: 'critical',
    banner:
      'HTTP/1.1 200 OK\n{"ID":"phantom-docker","Containers":12,"Images":34,"MemTotal":16777216000}',
  },
  {
    ip: '10.0.0.5',
    port: 502,
    product: 'Modbus/TCP',
    org: 'INTERNAL',
    country: 'US',
    vuln: 'ICS device reachable from DMZ',
    cve: null,
    risk: 'high',
    banner: 'TCP OPEN — Unit ID: 01, Function: Read Coils (0x01), Holding Regs accessible',
  },
];

const darkWebMentions = [
  {
    source: 'BreachForums',
    date: '2025-03-15',
    title: 'phantom.tech full source code — FREE',
    snippet: 'Sharing backend + terraform source. Contains DB creds, AWS keys, Stripe secret.',
    risk: 'critical',
    link: 'breachforums.st/t/…',
    type: 'leak',
  },
  {
    source: 'RaidForums (mirror)',
    date: '2025-01-10',
    title: 'RDP access phantom.tech $2500',
    snippet: 'Selling persistent access to phantom infra. 3 compromised hosts. Negotiate.',
    risk: 'critical',
    link: 'archive/rf/…',
    type: 'access-sale',
  },
  {
    source: 'Telegram @leakzone',
    date: '2025-04-01',
    title: 'phantom-tech AWS + Stripe keys leaked',
    snippet: 'AWS: AKIA… Stripe: whsec_… Keys still valid as of posting.',
    risk: 'critical',
    link: 't.me/leakzone/…',
    type: 'leak',
  },
  {
    source: 'Pastebin',
    date: '2025-05-20',
    title: 'phantom.tech DB dump 1.25M rows',
    snippet: 'Users table: emails + bcrypt. Includes payment history. MongoDB backup.',
    risk: 'critical',
    link: 'pastebin.com/…',
    type: 'data-dump',
  },
  {
    source: 'XSS.is',
    date: '2025-02-14',
    title: 'phantom.tech admin creds',
    snippet: 'admin / Phantom@2025! — still works on admin.phantom.tech. Checked 2025-02-14.',
    risk: 'critical',
    link: 'xss.is/threads/…',
    type: 'credentials',
  },
  {
    source: 'Tor onion forum',
    date: '2024-12-01',
    title: 'Phantom customer data auction 1.25M',
    snippet: 'Full PII: name, email, address, partial CC. Starting bid 0.5 BTC.',
    risk: 'critical',
    link: '[redacted].onion',
    type: 'auction',
  },
];

const faceRecognition = [
  {
    id: 'img1',
    match_conf: 97.4,
    source: 'LinkedIn',
    profile: 'John Doe — Phantom Security',
    date_found: '2025-06-01',
    detail: 'Profile photo matches seed image. Senior Backend Engineer.',
    risk: 'high',
  },
  {
    id: 'img2',
    match_conf: 89.2,
    source: 'GitHub',
    profile: 'johndoe-dev avatar',
    date_found: '2025-06-01',
    detail: 'Avatar image. Same metadata trail as LinkedIn profile.',
    risk: 'medium',
  },
  {
    id: 'img3',
    match_conf: 84.7,
    source: 'Conference',
    profile: 'DevOpsDays SF 2024 speaker photos',
    date_found: '2025-04-12',
    detail: 'Speaking session "Scaling Redis at Phantom". GPS data embedded.',
    risk: 'high',
  },
  {
    id: 'img4',
    match_conf: 71.3,
    source: 'Twitter/X',
    profile: '@phantomjohn profile',
    date_found: '2025-05-28',
    detail: 'Lower confidence — sunglasses. Outfit consistent w/ LinkedIn photo.',
    risk: 'low',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COLOR MAPS
// ─────────────────────────────────────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#f5a623',
  low: '#30d158',
  none: '#636366',
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: 'rgba(255,45,85,0.08)',
  HIGH: 'rgba(255,107,53,0.08)',
  MEDIUM: 'rgba(245,166,35,0.08)',
  LOW: 'rgba(48,209,88,0.08)',
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Pill({ level, label }: { level: string; label?: string }) {
  const c = RISK_COLOR[level.toLowerCase()] ?? '#636366';
  return (
    <span
      style={{ color: c, border: `1px solid ${c}30`, background: `${c}12` }}
      className="text-[8.5px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm font-mono shrink-0"
    >
      {label ?? level}
    </span>
  );
}

function SectionHdr({
  children,
  accent,
  count,
}: {
  children: React.ReactNode;
  accent?: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-[3px] h-3.5 rounded-full" style={{ background: accent ?? '#0af' }} />
      <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#4a5a7a]">
        {children}
      </span>
      {count !== undefined && (
        <span
          className="ml-1 text-[8px] font-mono px-1 py-0.5 rounded"
          style={{ background: `${accent ?? '#0af'}18`, color: accent ?? '#0af' }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function Row({ k, v, vc }: { k: string; v: string | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-[3.5px] border-b border-[#0e1420] last:border-0">
      <span className="text-[9px] text-[#2e3f5a] font-mono shrink-0">{k}</span>
      <span className={cn('text-[9.5px] font-mono text-right break-all', vc ?? 'text-[#7a8fa8]')}>
        {v}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  dim,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 p-2.5 bg-[#0a0e16] border border-[#141e2e] rounded',
        dim && 'opacity-60',
      )}
    >
      <div className="text-[8.5px] uppercase tracking-[0.12em] text-[#2e3f5a] font-mono">
        {label}
      </div>
      <div
        className="text-[17px] font-bold font-mono leading-none"
        style={{ color: accent ?? '#b0c4de' }}
      >
        {value}
      </div>
      {sub && <div className="text-[8.5px] text-[#2e3f5a] font-mono">{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED SCAN LINE
// ─────────────────────────────────────────────────────────────────────────────
function ScanBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-[2px] bg-[#0e1420] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #0af, #bf5af2)' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY GRAPH (SVG)
// ─────────────────────────────────────────────────────────────────────────────
const NODE_TYPE_COLOR: Record<string, string> = {
  email: '#0af',
  person: '#bf5af2',
  username: '#30d158',
  domain: '#ff6b35',
  phone: '#f5a623',
  social: '#4af',
  breach: '#ff2d55',
  ip: '#ff6b35',
};

function IdentityGraph() {
  const W = 520,
    H = 260;
  const centerX = 260,
    centerY = 130;
  const r1 = 90,
    r2 = 170;

  const nodes = identityGraph.nodes;
  const seedNode = nodes[0];

  // Positions
  const posMap: Record<string, { x: number; y: number }> = {
    seed: { x: centerX, y: centerY },
  };
  const ring1 = nodes.slice(1, 5);
  const ring2 = nodes.slice(5);
  ring1.forEach((n, i) => {
    const angle = (i / ring1.length) * Math.PI * 2 - Math.PI / 2;
    posMap[n.id] = { x: centerX + Math.cos(angle) * r1, y: centerY + Math.sin(angle) * r1 };
  });
  ring2.forEach((n, i) => {
    const angle = (i / ring2.length) * Math.PI * 2 - Math.PI / 4;
    posMap[n.id] = { x: centerX + Math.cos(angle) * r2, y: centerY + Math.sin(angle) * r2 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {/* Grid dots */}
      {Array.from({ length: 14 }).map((_, xi) =>
        Array.from({ length: 7 }).map((_, yi) => (
          <circle key={`${xi}-${yi}`} cx={xi * 40} cy={yi * 40} r={0.8} fill="#141e2e" />
        )),
      )}
      {/* Edges */}
      {identityGraph.edges.map(([a, b], i) => {
        const pa = posMap[a],
          pb = posMap[b];
        if (!pa || !pb) return null;
        const col = RISK_COLOR[nodes.find((n) => n.id === a)?.risk ?? 'none'];
        return (
          <line
            key={i}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke={col}
            strokeWidth={0.6}
            strokeOpacity={0.25}
            strokeDasharray="3 3"
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((n) => {
        const p = posMap[n.id];
        if (!p) return null;
        const isSeed = n.id === 'seed';
        const c = NODE_TYPE_COLOR[n.type] ?? '#4a5a7a';
        const riskC = RISK_COLOR[n.risk];
        return (
          <g key={n.id}>
            {isSeed && (
              <circle
                cx={p.x}
                cy={p.y}
                r={22}
                fill={`${riskC}10`}
                stroke={riskC}
                strokeWidth={0.5}
                strokeDasharray="4 2"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isSeed ? 7 : 4.5}
              fill={`${c}18`}
              stroke={c}
              strokeWidth={isSeed ? 1.5 : 1}
            />
            <text
              x={p.x}
              y={p.y + (isSeed ? 16 : 13)}
              textAnchor="middle"
              fontSize={isSeed ? 7.5 : 6.5}
              fill={isSeed ? c : '#4a5a7a'}
              fontFamily="monospace"
              fontWeight={isSeed ? 'bold' : 'normal'}
            >
              {n.label.length > 20 ? n.label.slice(0, 18) + '…' : n.label}
            </text>
            {isSeed && (
              <text
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fontSize={8}
                fill={c}
                fontFamily="monospace"
                fontWeight="bold"
              >
                ✉
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
function TabSummary() {
  const criticalBreaches = breachRecords.filter((b) => b.severity === 'CRITICAL').length;
  const criticalLeaks = codeLeaks.filter((l) => l.severity === 'CRITICAL').length;
  const darkCritical = darkWebMentions.filter((d) => d.risk === 'critical').length;

  const timeline = [
    ...breachRecords.map((b) => ({
      date: b.date,
      label: `Breach — ${b.source}`,
      risk: b.severity.toLowerCase(),
      type: 'breach',
    })),
    ...codeLeaks.map((l) => ({
      date: l.date,
      label: `Code Leak — ${l.file}`,
      risk: l.severity.toLowerCase(),
      type: 'code',
    })),
    ...darkWebMentions.map((d) => ({
      date: d.date,
      label: d.title.slice(0, 50),
      risk: d.risk,
      type: 'darkweb',
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 gap-2 content-start">
      {/* Stats Row */}
      <div className="col-span-3 grid grid-cols-7 gap-2">
        <StatCard
          label="Breaches"
          value={breachRecords.length}
          sub={`${criticalBreaches} CRITICAL`}
          accent="#ff2d55"
        />
        <StatCard
          label="Code Leaks"
          value={codeLeaks.length}
          sub={`${criticalLeaks} secrets`}
          accent="#ff2d55"
        />
        <StatCard
          label="Social Hits"
          value={socialProfiles.length}
          sub="verified platforms"
          accent="#30d158"
        />
        <StatCard
          label="Face Matches"
          value={faceRecognition.length}
          sub="97.4% top confidence"
          accent="#bf5af2"
        />
        <StatCard
          label="Dark Web"
          value={darkWebMentions.length}
          sub={`${darkCritical} critical`}
          accent="#ff2d55"
        />
        <StatCard
          label="IoT Exposed"
          value={iotAssets.length}
          sub="5 critical services"
          accent="#ff6b35"
        />
        <StatCard
          label="Metadata"
          value={metadataFindings.length}
          sub="8 artifacts"
          accent="#f5a623"
        />
      </div>

      {/* Identity Graph */}
      <div className="col-span-2 bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#0af">Identity Graph — {TARGET_QUERY}</SectionHdr>
        <IdentityGraph />
      </div>

      {/* Threat Score */}
      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3 flex flex-col gap-2">
        <SectionHdr accent="#ff2d55">Threat Exposure</SectionHdr>
        {[
          { label: 'Breach Exposure', val: 95, c: '#ff2d55' },
          { label: 'Code Leaks', val: 90, c: '#ff2d55' },
          { label: 'Social Footprint', val: 78, c: '#ff6b35' },
          { label: 'Dark Web Presence', val: 88, c: '#ff2d55' },
          { label: 'IoT Attack Surface', val: 85, c: '#ff6b35' },
          { label: 'Metadata Risk', val: 70, c: '#f5a623' },
          { label: 'Face Recognition', val: 82, c: '#ff6b35' },
        ].map(({ label, val, c }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[8.5px] font-mono text-[#2e3f5a] w-28 shrink-0">{label}</span>
            <div className="flex-1 h-[4px] bg-[#0e1420] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${val}%`, background: c }} />
            </div>
            <span className="text-[9px] font-bold font-mono w-6 text-right" style={{ color: c }}>
              {val}
            </span>
          </div>
        ))}
        <div className="mt-2 p-2 bg-[#ff2d5508] border border-[#ff2d5520] rounded">
          <div className="text-[8px] text-[#ff2d55] font-mono font-bold tracking-wider mb-1">
            ⬤ OVERALL RISK SCORE
          </div>
          <div className="text-[28px] font-bold font-mono text-[#ff2d55] leading-none">
            94 <span className="text-[12px] text-[#3a4558]">/ 100</span>
          </div>
          <div className="text-[8px] text-[#3a4558] font-mono mt-1">
            CRITICAL — Immediate action required
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="col-span-3 bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#f5a623">Event Timeline (Recent)</SectionHdr>
        <div className="grid grid-cols-2 gap-x-6 relative pl-3">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-[#141e2e]" />
          {timeline.map((ev, i) => (
            <div key={i} className="relative pl-3 py-1 border-b border-[#0e1420] last:border-0">
              <div
                className="absolute -left-[5px] top-2 w-2 h-2 rounded-full border"
                style={{ borderColor: RISK_COLOR[ev.risk], background: `${RISK_COLOR[ev.risk]}20` }}
              />
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] font-mono text-[#2e3f5a] shrink-0">{ev.date}</span>
                <Pill level={ev.risk} />
              </div>
              <div className="text-[9px] font-mono text-[#5a7090] mt-0.5 truncate">{ev.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PEOPLE & SOCIAL
// ─────────────────────────────────────────────────────────────────────────────
function TabPeople() {
  const [selected, setSelected] = useState(0);
  const profile = socialProfiles[selected];
  const STATUS_COLOR: Record<string, string> = {
    verified: '#30d158',
    probable: '#f5a623',
    unverified: '#636366',
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 gap-2 content-start">
      {/* Social profile list */}
      <div className="col-span-2 bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#30d158" count={socialProfiles.length}>
          Social & Username Hits
        </SectionHdr>
        <div className="space-y-1">
          {socialProfiles.map((p, i) => (
            <div
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                'flex items-start gap-3 p-2 rounded cursor-pointer transition-all border',
                selected === i
                  ? 'border-[#30d15830] bg-[#30d15808]'
                  : 'border-transparent hover:border-[#1c2e44] hover:bg-[#0d1520]',
              )}
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center text-[14px] shrink-0 bg-[#0e1420] border border-[#1c2e44]"
                style={{ color: STATUS_COLOR[p.status] }}
              >
                {p.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9.5px] font-bold font-mono text-[#a0b4cc]">
                    {p.platform}
                  </span>
                  <span className="text-[8.5px] font-mono text-[#3a4f68]">{p.handle}</span>
                  <div className="ml-auto flex items-center gap-1">
                    {p.leak && (
                      <span className="text-[7.5px] font-bold font-mono px-1 py-0.5 rounded bg-[#ff2d5512] border border-[#ff2d5525] text-[#ff2d55]">
                        LEAK
                      </span>
                    )}
                    <span
                      className="text-[7.5px] font-mono px-1 py-0.5 rounded"
                      style={{
                        color: STATUS_COLOR[p.status],
                        background: `${STATUS_COLOR[p.status]}10`,
                        border: `1px solid ${STATUS_COLOR[p.status]}30`,
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className="text-[8.5px] font-mono text-[#3a4f68] truncate">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile detail + face rec */}
      <div className="space-y-2">
        <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
          <SectionHdr accent="#30d158">Profile Detail</SectionHdr>
          <div
            className="w-12 h-12 rounded-lg bg-[#0e1420] border border-[#1c2e44] flex items-center justify-center text-[24px] mb-3"
            style={{ color: STATUS_COLOR[profile.status] }}
          >
            {profile.avatar}
          </div>
          <Row k="Platform" v={profile.platform} vc="text-[#30d158] font-bold" />
          <Row k="Handle" v={profile.handle} vc="text-[#a0b4cc]" />
          <Row k="URL" v={profile.url} vc="text-[#0af]" />
          <Row k="Followers" v={profile.followers.toLocaleString()} />
          <Row k="Last Seen" v={profile.lastSeen} />
          <Row k="Status" v={profile.status} vc={`font-bold`} />
          <div className="mt-2 p-2 bg-[#0e1420] rounded text-[8.5px] font-mono text-[#4a6070] leading-relaxed">
            {profile.detail}
          </div>
        </div>

        {/* Face recognition */}
        <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
          <SectionHdr accent="#bf5af2" count={faceRecognition.length}>
            Face Recognition
          </SectionHdr>
          <div className="space-y-1.5">
            {faceRecognition.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-1.5 bg-[#0e1420] rounded border border-[#141e2e]"
              >
                <div className="w-6 h-6 rounded bg-[#bf5af218] border border-[#bf5af230] flex items-center justify-center text-[10px] text-[#bf5af2] shrink-0">
                  ◈
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[9px] font-bold font-mono"
                      style={{
                        color:
                          f.match_conf > 90 ? '#ff2d55' : f.match_conf > 80 ? '#f5a623' : '#30d158',
                      }}
                    >
                      {f.match_conf}%
                    </span>
                    <span className="text-[8.5px] font-mono text-[#3a4f68]">{f.source}</span>
                    <Pill level={f.risk} />
                  </div>
                  <div className="text-[8px] font-mono text-[#3a4f68] truncate">{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CODE & DIGITAL FOOTPRINT
// ─────────────────────────────────────────────────────────────────────────────
function TabCode() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="grid grid-cols-4 gap-2">
        <StatCard
          label="Secrets Found"
          value={codeLeaks.length}
          accent="#ff2d55"
          sub="across 3 platforms"
        />
        <StatCard
          label="Critical Leaks"
          value={codeLeaks.filter((l) => l.severity === 'CRITICAL').length}
          accent="#ff2d55"
          sub="immediate revoke needed"
        />
        <StatCard
          label="Repos Scanned"
          value={3}
          accent="#ff6b35"
          sub="GitHub + GitLab + Pastebin"
        />
        <StatCard label="Commit History" value="847" accent="#f5a623" sub="commits analyzed" />
      </div>

      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#ff2d55" count={codeLeaks.length}>
          Leaked Secrets — Code Repositories
        </SectionHdr>
        <div className="space-y-1">
          {codeLeaks.map((l, i) => (
            <div key={i} className="border border-[#141e2e] rounded overflow-hidden">
              <div
                className="flex items-center gap-3 p-2 cursor-pointer hover:bg-[#0e1420] transition-colors"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span
                  className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: l.severity === 'CRITICAL' ? '#ff2d5515' : '#ff6b3515',
                    color: l.severity === 'CRITICAL' ? '#ff2d55' : '#ff6b35',
                    border: `1px solid ${l.severity === 'CRITICAL' ? '#ff2d5530' : '#ff6b3530'}`,
                  }}
                >
                  {l.severity}
                </span>
                <span className="text-[9px] font-bold font-mono text-[#ff6b35] w-16 shrink-0">
                  {l.platform}
                </span>
                <span className="text-[8.5px] font-mono text-[#3a4f68] w-40 shrink-0 truncate">
                  {l.repo}
                </span>
                <span className="text-[8.5px] font-mono text-[#0af] truncate flex-1">
                  {l.file}:{l.line}
                </span>
                <span className="text-[8px] font-mono text-[#2e3f5a] shrink-0">{l.date}</span>
                <span className="text-[9px] text-[#2e3f5a] ml-1">{expanded === i ? '▲' : '▼'}</span>
              </div>
              {expanded === i && (
                <div className="bg-[#050810] border-t border-[#141e2e] p-3">
                  <div className="text-[8px] text-[#2e3f5a] font-mono mb-1">
                    TYPE: <span className="text-[#f5a623]">{l.type}</span> · COMMIT:{' '}
                    <span className="text-[#0af]">{l.commit}</span>
                  </div>
                  <pre className="text-[9px] font-mono text-[#ff2d55] bg-[#ff2d5506] border border-[#ff2d5518] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                    {l.secret}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#f5a623" count={metadataFindings.length}>
          Metadata & File Forensics
        </SectionHdr>
        <div className="grid grid-cols-2 gap-1">
          {metadataFindings.map((m, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 bg-[#0e1420] rounded border border-[#141e2e]"
            >
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: RISK_COLOR[m.risk] }}
              />
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[8px] font-mono text-[#f5a623] font-bold">{m.type}</span>
                  <Pill level={m.risk} />
                </div>
                <div className="text-[8.5px] font-mono text-[#3a4f68] truncate">{m.file}</div>
                <div className="text-[8px] font-mono text-[#2e3f5a] mt-0.5 leading-relaxed">
                  {m.finding}
                </div>
                <div className="text-[7.5px] font-mono text-[#1c2e44] mt-0.5">via {m.tool}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: BREACH & DARK WEB
// ─────────────────────────────────────────────────────────────────────────────
function TabBreach() {
  const [activeBreachIdx, setActiveBreachIdx] = useState(0);
  const DARK_TYPE_COLOR: Record<string, string> = {
    leak: '#ff2d55',
    'access-sale': '#ff6b35',
    'data-dump': '#f5a623',
    credentials: '#ff2d55',
    auction: '#bf5af2',
    default: '#636366',
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
      {/* Breaches */}
      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#f5a623" count={breachRecords.length}>
          Breach Records
        </SectionHdr>
        <div className="space-y-1 mb-2">
          {breachRecords.map((b, i) => (
            <div
              key={i}
              onClick={() => setActiveBreachIdx(i)}
              className={cn(
                'p-2 rounded border cursor-pointer transition-all',
                activeBreachIdx === i
                  ? 'border-[#f5a62330] bg-[#f5a62308]'
                  : 'border-transparent hover:border-[#1c2e44]',
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Pill level={b.severity.toLowerCase()} />
                <span className="text-[9.5px] font-bold font-mono text-[#a0b4cc]">{b.source}</span>
                <span className="text-[8px] font-mono text-[#2e3f5a] ml-auto">{b.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] font-mono text-[#0af]">{b.email}</span>
                {b.plain && (
                  <span className="text-[8px] font-mono text-[#ff2d55] font-bold">
                    PLAIN: {b.plain}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Selected breach detail */}
        {(() => {
          const b = breachRecords[activeBreachIdx];
          return (
            <div className="p-2.5 bg-[#050810] rounded border border-[#141e2e] space-y-1">
              <Row k="Email" v={b.email} vc="text-[#0af]" />
              <Row k="Password" v={b.password} vc="text-[#f5a623]" />
              <Row k="Hash" v={b.hash} />
              {b.plain && <Row k="Cracked" v={b.plain} vc="text-[#ff2d55] font-bold" />}
              {b.ip && <Row k="IP" v={b.ip} vc="text-[#ff6b35]" />}
              {b.extra.map((e, i) => (
                <Row key={i} k="Extra" v={e} vc="text-[#4a6070]" />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Dark Web */}
      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#ff2d55" count={darkWebMentions.length}>
          Dark Web Mentions
        </SectionHdr>
        <div className="space-y-1.5">
          {darkWebMentions.map((d, i) => {
            const c = DARK_TYPE_COLOR[d.type] ?? DARK_TYPE_COLOR.default;
            return (
              <div
                key={i}
                className="p-2.5 rounded border"
                style={{ borderColor: `${c}20`, background: `${c}06` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[7.5px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ color: c, background: `${c}15`, border: `1px solid ${c}25` }}
                  >
                    {d.type}
                  </span>
                  <span className="text-[8.5px] font-mono text-[#3a4f68]">{d.source}</span>
                  <span className="text-[8px] font-mono text-[#2e3f5a] ml-auto">{d.date}</span>
                </div>
                <div className="text-[9px] font-bold font-mono mb-1" style={{ color: c }}>
                  {d.title}
                </div>
                <div className="text-[8.5px] font-mono text-[#3a4f68] leading-relaxed">
                  {d.snippet}
                </div>
                <div className="text-[7.5px] font-mono text-[#1c2e44] mt-1">↗ {d.link}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: GEO & PHONE
// ─────────────────────────────────────────────────────────────────────────────
function TabGeo() {
  const { ip, phone } = geoPhoneData;
  return (
    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
      {/* IP Geo */}
      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#ff6b35">IP Geolocation & Reputation</SectionHdr>
        <div className="font-mono text-[11px] font-bold text-[#0af] mb-3">{ip.address}</div>
        <Row k="Country" v={`${ip.country} 🇺🇸`} />
        <Row k="Region" v={ip.region} />
        <Row k="City" v={ip.city} />
        <Row k="ISP" v={ip.isp} vc="text-[#f5a623]" />
        <Row k="ASN" v={ip.asn} />
        <Row k="Lat / Lon" v={`${ip.lat}, ${ip.lon}`} />
        <Row k="Timezone" v={ip.timezone} />

        <div className="mt-3 grid grid-cols-2 gap-1">
          {[
            { label: 'Proxy', val: ip.proxy, yes: 'YES ⚠', no: 'NO ✓' },
            { label: 'VPN', val: ip.vpn, yes: 'YES ⚠', no: 'NO ✓' },
            { label: 'Tor Exit', val: ip.tor, yes: 'YES ⚠', no: 'NO ✓' },
            { label: 'Datacenter', val: ip.datacenter, yes: 'YES', no: 'NO' },
          ].map(({ label, val, yes, no }) => (
            <div
              key={label}
              className="flex justify-between p-1.5 bg-[#0e1420] rounded text-[8.5px] font-mono"
            >
              <span className="text-[#2e3f5a]">{label}</span>
              <span
                style={{
                  color: val ? (label === 'Datacenter' ? '#f5a623' : '#ff2d55') : '#30d158',
                }}
              >
                {val ? yes : no}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2 p-2 bg-[#ff2d5508] rounded border border-[#ff2d5520]">
          <div className="text-[8px] text-[#ff2d55] font-mono mb-1">ABUSE SCORE</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[5px] bg-[#0e1420] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ff2d55]"
                style={{ width: `${ip.abuse_score}%` }}
              />
            </div>
            <span className="text-[11px] font-bold font-mono text-[#ff2d55]">
              {ip.abuse_score}%
            </span>
          </div>
          <div className="flex gap-1 mt-1.5">
            {ip.tags.map((t) => (
              <span
                key={t}
                className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-[#ff2d5510] border border-[#ff2d5525] text-[#ff2d55]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Fake map */}
        <div className="mt-3 h-20 bg-[#060810] rounded border border-[#141e2e] relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute border-[#0af] border-opacity-10"
                style={{ left: `${i * 14}%`, top: 0, bottom: 0, borderLeftWidth: 1 }}
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute border-[#0af] border-opacity-10"
                style={{ top: `${i * 25}%`, left: 0, right: 0, borderTopWidth: 1 }}
              />
            ))}
          </div>
          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#ff2d55] border-2 border-[#ff2d5540] animate-pulse" />
            <span className="text-[7.5px] font-mono text-[#0af]">
              {ip.city}, {ip.region}
            </span>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#f5a623">Phone Intelligence</SectionHdr>
        <div className="font-mono text-[11px] font-bold text-[#f5a623] mb-3">{phone.number}</div>
        <Row k="Carrier" v={phone.carrier} vc="text-[#f5a623]" />
        <Row k="Type" v={phone.type} />
        <Row k="Country" v={phone.country} />
        <Row k="Region" v={phone.region} />
        <Row k="Ported" v={phone.ported ? 'YES' : 'NO'} />
        <Row
          k="VOIP"
          v={phone.voip ? 'YES ⚠' : 'NO ✓'}
          vc={phone.voip ? 'text-[#ff2d55]' : 'text-[#30d158]'}
        />

        <div className="mt-3">
          <div className="text-[8.5px] font-mono text-[#2e3f5a] mb-2 uppercase tracking-wider">
            App Presence
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { app: 'WhatsApp', active: phone.whatsapp, color: '#30d158', icon: '◉' },
              { app: 'Signal', active: phone.signal, color: '#0af', icon: '◈' },
              { app: 'Telegram', active: phone.telegram, color: '#0af', icon: '⬡' },
            ].map(({ app, active, color, icon }) => (
              <div
                key={app}
                className="flex flex-col items-center gap-1 p-2 rounded border"
                style={{
                  borderColor: active ? `${color}30` : '#141e2e',
                  background: active ? `${color}08` : 'transparent',
                }}
              >
                <span style={{ color: active ? color : '#2e3f5a', fontSize: 16 }}>{icon}</span>
                <span
                  className="text-[8px] font-mono"
                  style={{ color: active ? color : '#2e3f5a' }}
                >
                  {app}
                </span>
                <span
                  className="text-[7px] font-mono"
                  style={{ color: active ? color : '#1c2e44' }}
                >
                  {active ? 'ACTIVE' : 'NOT FOUND'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 p-2 bg-[#f5a62308] rounded border border-[#f5a62320]">
          <div className="text-[8px] text-[#f5a623] font-mono mb-1">SPAM SCORE</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[5px] bg-[#0e1420] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#f5a623]"
                style={{ width: `${phone.spam_score}%` }}
              />
            </div>
            <span className="text-[11px] font-bold font-mono text-[#f5a623]">
              {phone.spam_score}%
            </span>
          </div>
          <div className="text-[8px] font-mono text-[#2e3f5a] mt-1">
            Low spam activity. Not blocklisted.
          </div>
        </div>

        {/* OTP / Carrier note */}
        <div className="mt-2 p-2 bg-[#0e1420] rounded border border-[#141e2e] text-[8.5px] font-mono text-[#3a4f68] leading-relaxed">
          ⚠ OTP Brute-force: Target uses SMS 2FA via T-Mobile. SIM-swap vector viable — carrier
          verification bypasses on record for T-Mobile accounts. Recommend targeting via SS7 or
          social engineering carrier support.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: IOT & SHODAN
// ─────────────────────────────────────────────────────────────────────────────
function TabIoT() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="grid grid-cols-4 gap-2">
        <StatCard
          label="Exposed Assets"
          value={iotAssets.length}
          accent="#ff6b35"
          sub="via Shodan / Census"
        />
        <StatCard
          label="Critical"
          value={iotAssets.filter((a) => a.risk === 'critical').length}
          accent="#ff2d55"
          sub="RCE / anon access"
        />
        <StatCard
          label="CVEs Linked"
          value={iotAssets.filter((a) => a.cve).length}
          accent="#ff6b35"
          sub="confirmed exploitable"
        />
        <StatCard
          label="ICS / SCADA"
          value={iotAssets.filter((a) => a.product.includes('Modbus')).length}
          accent="#f5a623"
          sub="industrial systems"
        />
      </div>

      <div className="bg-[#0a0e16] border border-[#141e2e] rounded p-3">
        <SectionHdr accent="#ff6b35" count={iotAssets.length}>
          IoT / Shodan Exposed Assets
        </SectionHdr>
        <div className="space-y-1">
          {iotAssets.map((a, i) => {
            const c = RISK_COLOR[a.risk];
            return (
              <div
                key={i}
                className="border rounded overflow-hidden"
                style={{ borderColor: `${c}20` }}
              >
                <div
                  className="flex items-center gap-3 p-2 cursor-pointer hover:bg-[#0e1420] transition-colors"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{ background: `${c}05` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                  <span
                    className="font-mono text-[10px] font-bold w-16 shrink-0"
                    style={{ color: c }}
                  >
                    {a.ip}:{a.port}
                  </span>
                  <span className="text-[9.5px] font-mono text-[#a0b4cc] w-32 shrink-0 truncate">
                    {a.product}
                  </span>
                  <span className="text-[8.5px] font-mono text-[#3a4f68] flex-1 truncate">
                    {a.vuln}
                  </span>
                  {a.cve && (
                    <span className="text-[8px] font-mono text-[#ff6b35] shrink-0">{a.cve}</span>
                  )}
                  <Pill level={a.risk} />
                  <span className="text-[9px] text-[#2e3f5a] ml-1">
                    {expanded === i ? '▲' : '▼'}
                  </span>
                </div>
                {expanded === i && (
                  <div className="bg-[#040608] border-t p-3" style={{ borderColor: `${c}15` }}>
                    <pre
                      className="text-[8.5px] font-mono leading-relaxed overflow-x-auto"
                      style={{ color: `${c}cc` }}
                    >
                      {a.banner}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TAB DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'summary', label: 'Summary', accent: '#0af' },
  { id: 'people', label: 'People & Social', accent: '#30d158' },
  { id: 'code', label: 'Code & Leaks', accent: '#ff2d55' },
  { id: 'breach', label: 'Breach / Dark', accent: '#f5a623' },
  { id: 'geo', label: 'Geo & Phone', accent: '#ff6b35' },
  { id: 'iot', label: 'IoT / Shodan', accent: '#bf5af2' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH BAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function SearchBar() {
  const [mode, setMode] = useState<OsintMode>('domain');
  const [query, setQuery] = useState(TARGET_QUERY);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(100);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentMode = MODES.find((m) => m.id === mode)!;

  const handleScan = () => {
    setScanning(true);
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(progressRef.current!);
        setScanning(false);
      }
      setProgress(p);
    }, 120);
  };

  return (
    <div className="shrink-0 border-b border-[#141e2e] bg-[#060810]">
      {/* Mode tabs */}
      <div className="flex items-center gap-0 px-3 pt-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[8.5px] uppercase tracking-[0.1em] font-bold transition-all rounded-t font-mono border-b-2',
              mode === m.id
                ? 'text-[#c8d6f0]'
                : 'text-[#1c2e44] hover:text-[#3a4f68] border-transparent',
            )}
            style={{ borderBottomColor: mode === m.id ? m.accent : 'transparent' }}
          >
            <span style={{ color: mode === m.id ? m.accent : '#1c2e44' }}>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Query input */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 flex items-center gap-2 bg-[#0a0e16] border border-[#1c2e44] rounded px-3 h-8">
          <span className="text-[10px]" style={{ color: currentMode.accent }}>
            {currentMode.icon}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={currentMode.placeholder}
            className="flex-1 bg-transparent outline-none text-[10px] font-mono text-[#a0b4cc] placeholder-[#1c2e44]"
          />
          {scanning && (
            <span className="text-[8px] font-mono text-[#2e3f5a] animate-pulse">SCANNING…</span>
          )}
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          className="h-8 px-4 text-[8.5px] font-bold uppercase tracking-widest font-mono rounded transition-all"
          style={{
            background: scanning ? `${currentMode.accent}10` : `${currentMode.accent}18`,
            border: `1px solid ${currentMode.accent}40`,
            color: scanning ? `${currentMode.accent}80` : currentMode.accent,
          }}
        >
          {scanning ? '◌ Running' : '▶ Recon'}
        </button>

        <div className="flex items-center gap-1">
          {['⬡ WHOIS', '⬢ DNS', '◈ Cert', '◎ Shodan', '◉ VT'].map((tag) => (
            <span
              key={tag}
              className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-[#0a0e16] border border-[#141e2e] text-[#2e3f5a] cursor-pointer hover:border-[#1c2e44] hover:text-[#3a4f68] transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>

        <span className="text-[8px] font-mono text-[#ff2d55] px-2 py-1 rounded bg-[#ff2d5510] border border-[#ff2d5525] ml-auto shrink-0">
          ⬤ RISK 94/100
        </span>
      </div>

      <div className="px-3 pb-2">
        <ScanBar progress={progress} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function OSINT() {
  const [active, setActive] = useState<TabId>('summary');
  const activeTab = TABS.find((t) => t.id === active)!;

  const renderContent = () => {
    switch (active) {
      case 'summary':
        return <TabSummary />;
      case 'people':
        return <TabPeople />;
      case 'code':
        return <TabCode />;
      case 'breach':
        return <TabBreach />;
      case 'geo':
        return <TabGeo />;
      case 'iot':
        return <TabIoT />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#060810]" style={{ fontFamily: FONT }}>
      {/* Search / Query bar */}
      <SearchBar />

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-3 h-[30px] bg-[#060810] border-b border-[#141e2e] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'h-full px-3 text-[9px] uppercase tracking-[0.1em] font-bold transition-all relative whitespace-nowrap font-mono',
              active === tab.id ? 'text-[#c8d6f0]' : 'text-[#1c2e44] hover:text-[#3a4f68]',
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
          <span className="text-[7.5px] font-mono text-[#1c2e44]">TARGET:</span>
          <span className="text-[8.5px] font-mono text-[#0af]">{TARGET_QUERY}</span>
          <div className="w-px h-3 bg-[#141e2e]" />
          <button className="h-5 px-2 bg-[#0a0e16] border border-[#141e2e] text-[#3a4f68] text-[8px] rounded font-mono hover:text-[#6a8090] transition-colors">
            Export
          </button>
          <button className="h-5 px-2 bg-[#0a0e16] border border-[#141e2e] text-[#3a4f68] text-[8px] rounded font-mono hover:text-[#6a8090] transition-colors">
            Report
          </button>
        </div>
      </div>

      {/* Tab content */}
      {renderContent()}
    </div>
  );
}
