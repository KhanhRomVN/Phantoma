// ============================================================================
// RECON — Shared mock data, constants, and UI components
// Used by all tab sub-folders
// ============================================================================
import { cn } from '../../../../../shared/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────
export const TARGET = 'phantom.tech';
export const TARGET_IP = '198.51.100.78';
export const SCAN_TIME = '2025-06-04T03:47:22Z';

// ── Mock data ─────────────────────────────────────────────────────────────────
export const riskScore = {
  total: 87,
  breakdown: { network: 92, breach: 95, exposure: 78, reputation: 65 },
};

export const dnsRecords = {
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

export const whoisData = {
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

export const breaches = [
  { name: 'Phantom Internal DB 2025', date: '2025-01-15', accounts: 1250000, categories: ['emails', 'passwords', 'ips', 'payment'], severity: 'CRITICAL', description: 'Misconfigured MongoDB exposed PII, hashed passwords and payment history.' },
  { name: 'LinkedIn Scrape 2021', date: '2021-06-22', accounts: 700000000, categories: ['emails', 'passwords'], severity: 'CRITICAL', description: 'Mass scrape of LinkedIn profiles including email/password pairs.' },
  { name: 'Collection #1 2019', date: '2019-01-07', accounts: 773000000, categories: ['emails', 'passwords'], severity: 'HIGH', description: 'Aggregate of multiple prior breaches, widely circulated.' },
  { name: 'Adobe 2013', date: '2013-10-04', accounts: 152445165, categories: ['emails', 'passwords', 'hints'], severity: 'MEDIUM', description: 'Password hints included, enabling targeted attacks.' },
];

export const harvestedEmails = [
  { email: 'admin@phantom.tech', source: 'WHOIS', verified: true, role: 'Administrator', breach: true },
  { email: 'security@phantom.tech', source: 'GitHub', verified: true, role: 'Security Team', breach: false },
  { email: 'john.doe@phantom.tech', source: 'LinkedIn', verified: true, role: 'Backend Engineer', breach: true },
  { email: 'support@phantom.tech', source: 'Twitter', verified: false, role: 'Support', breach: false },
  { email: 'contact@phantom.tech', source: 'PGP Keyserver', verified: true, role: 'General', breach: false },
  { email: 'sales@phantom.tech', source: 'Crunchbase', verified: false, role: 'Sales', breach: false },
  { email: 'devops@phantom.tech', source: 'GitHub commit', verified: true, role: 'DevOps Lead', breach: true },
  { email: 'abuse@phantom.tech', source: 'WHOIS (registrar)', verified: true, role: 'Abuse Contact', breach: false },
];

export const ports = [
  { port: 22, service: 'SSH', product: 'OpenSSH 8.9p1', state: 'open', risk: 'medium', cve: ['CVE-2023-38408'] },
  { port: 25, service: 'SMTP', product: 'Postfix 3.6.4', state: 'open', risk: 'low', cve: [] },
  { port: 80, service: 'HTTP', product: 'nginx 1.24.0', state: 'open', risk: 'low', cve: [] },
  { port: 443, service: 'HTTPS', product: 'nginx 1.24.0 + TLS1.3', state: 'open', risk: 'low', cve: [] },
  { port: 3306, service: 'MySQL', product: 'MySQL 8.0.33', state: 'open', risk: 'critical', cve: ['CVE-2023-2182'] },
  { port: 8080, service: 'HTTP-ALT', product: 'Jenkins 2.401.1', state: 'open', risk: 'critical', cve: ['CVE-2023-27898'] },
  { port: 8443, service: 'HTTPS-ALT', product: 'Apache Tomcat 9.0.78', state: 'open', risk: 'high', cve: ['CVE-2023-28708'] },
  { port: 27017, service: 'MongoDB', product: 'MongoDB 5.0.14', state: 'filtered', risk: 'medium', cve: [] },
  { port: 6379, service: 'Redis', product: 'Redis 7.0.5', state: 'open', risk: 'critical', cve: ['CVE-2022-0543'] },
  { port: 9200, service: 'Elasticsearch', product: 'Elastic 8.5.0', state: 'open', risk: 'high', cve: [] },
];

export const vulns = [
  { cve: 'CVE-2023-38408', cvss: 9.8, severity: 'CRITICAL', service: 'OpenSSH', desc: 'Remote code execution via ssh-agent forwarding.', exploitable: true },
  { cve: 'CVE-2023-27898', cvss: 8.9, severity: 'HIGH', service: 'Jenkins', desc: 'Auth bypass via crafted HTTP request to API endpoint.', exploitable: true },
  { cve: 'CVE-2023-2182', cvss: 7.5, severity: 'HIGH', service: 'MySQL', desc: 'DoS via specially crafted SELECT query.', exploitable: false },
  { cve: 'CVE-2023-28708', cvss: 7.3, severity: 'HIGH', service: 'Tomcat', desc: 'Session fixation via JSESSIONID cookie manipulation.', exploitable: true },
  { cve: 'CVE-2022-0543', cvss: 10.0, severity: 'CRITICAL', service: 'Redis', desc: 'Lua sandbox escape allowing full RCE on the host.', exploitable: true },
];

export const subdomains = [
  { name: 'admin', status: 200, risk: 'critical', title: 'Admin Dashboard', server: 'nginx/1.24.0', tech: 'React' },
  { name: 'api', status: 200, risk: 'medium', title: 'API Gateway', server: 'nginx/1.24.0', tech: 'Express' },
  { name: 'jenkins', status: 200, risk: 'critical', title: 'Jenkins CI', server: 'Jetty/9.4', tech: 'Java' },
  { name: 'vpn', status: 200, risk: 'critical', title: 'VPN Portal', server: 'OpenResty', tech: 'Lua' },
  { name: 'git', status: 200, risk: 'high', title: 'Gitea', server: 'Go', tech: 'Go' },
  { name: 'monitor', status: 200, risk: 'high', title: 'Grafana', server: 'Grafana/10.0', tech: 'Go' },
  { name: 'kibana', status: 200, risk: 'high', title: 'Kibana', server: 'Kibana/8.5', tech: 'Node' },
  { name: 'registry', status: 200, risk: 'high', title: 'Docker Registry', server: 'Go', tech: 'Docker' },
  { name: 'dev', status: 403, risk: 'medium', title: 'Forbidden', server: 'nginx/1.24.0', tech: '—' },
  { name: 'backup', status: 401, risk: 'medium', title: 'Auth Required', server: 'nginx/1.24.0', tech: '—' },
  { name: 'staging', status: 404, risk: 'low', title: 'Not Found', server: 'nginx/1.24.0', tech: '—' },
  { name: 'mail', status: 301, risk: 'low', title: 'Redirect', server: 'nginx/1.24.0', tech: '—' },
  { name: 'blog', status: 200, risk: 'low', title: 'Blog', server: 'WordPress', tech: 'PHP' },
  { name: 'minio', status: 200, risk: 'high', title: 'MinIO Console', server: 'MinIO', tech: 'Go' },
  { name: 'partner', status: 200, risk: 'medium', title: 'Partner Portal', server: 'IIS/10.0', tech: '.NET' },
  { name: 'cdn', status: 200, risk: 'low', title: 'CDN', server: 'cloudflare', tech: '—' },
];

export const techStack = {
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

export const cloudAssets = [
  { type: 'AWS S3', name: 'phantom-backups', perm: 'PUBLIC READ', risk: 'critical', files: ['database.sql.gz', 'customer_emails.csv', 'config.env'] },
  { type: 'Docker Registry', name: 'registry.phantom.tech', perm: 'ANON PULL', risk: 'critical', files: ['phantom/api:latest', 'phantom/web:staging', 'phantom/worker:debug'] },
  { type: 'GCP Storage', name: 'phantom-logs', perm: 'auth-read', risk: 'medium', files: ['access_log_2025-05.txt'] },
  { type: 'Azure Blob', name: 'phantomcdn', perm: 'PUBLIC READ', risk: 'high', files: ['index.html', 'bundle.js.map'] },
];

export const codeRepos = [
  { platform: 'GitHub', repo: 'phantom-security/backend', secrets: ['AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE', 'JWT_SECRET=s3cr3t!ghost'], lastCommit: '2025-06-01', stars: 0, private: false },
  { platform: 'GitHub', repo: 'phantom-security/terraform', secrets: ['db_password=phantom@2025', 'private_key.pem (RSA 4096)'], lastCommit: '2025-05-28', stars: 2, private: false },
  { platform: 'GitLab', repo: 'phantom/internal-tools', secrets: ['CI_JOB_TOKEN=glptt-abc123', 'SSH_DEPLOY_KEY'], lastCommit: '2025-06-02', stars: 0, private: false },
];

export const darkWebLeaks = [
  { source: 'Pastebin', date: '2025-05-20', snippet: 'phantom.tech DB dump — users table: 1.25M rows w/ bcrypt hashes, plaintext emails', risk: 'critical' },
  { source: 'RaidForums (mirror)', date: '2025-01-10', snippet: 'Selling RDP access to phantom.tech infra — $2500 negotiable', risk: 'critical' },
  { source: 'Telegram (@leakzone)', date: '2025-04-01', snippet: 'Leaked API keys for phantom-tech AWS + Stripe webhook secret', risk: 'high' },
  { source: 'BreachForums', date: '2025-03-15', snippet: 'phantom.tech source code zip (backend + terraform) — free share', risk: 'critical' },
];

export const threatIntel = [
  { source: 'VirusTotal', indicator: TARGET, detections: '2/89', verdict: 'suspicious', detail: 'Flagged by ESET + Kaspersky for phishing campaign artifacts' },
  { source: 'VirusTotal', indicator: TARGET_IP, detections: '3/89', verdict: 'malicious', detail: 'Known C2 communication, associated with RedLine stealer' },
  { source: 'AlienVault OTX', indicator: TARGET, detections: '1 pulse', verdict: 'suspicious', detail: '"Phantom.tech phishing campaign" pulse from Feb 2025' },
  { source: 'AbuseIPDB', indicator: TARGET_IP, detections: '78% confidence', verdict: 'malicious', detail: 'Reported 12 times for SSH brute force + port scanning' },
  { source: 'Shodan', indicator: TARGET_IP, detections: '5 vulns', verdict: 'high-risk', detail: 'Critical services exposed: Redis, MySQL, Jenkins unauthenticated' },
];

export const httpHeaders: Record<string, string> = {
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

export const googleDorks = [
  { type: 'Admin Panels', query: `site:${TARGET} intitle:"admin" OR intitle:"login"`, results: 12, urls: ['admin.phantom.tech', 'dashboard.phantom.tech/login'] },
  { type: 'Sensitive Files', query: `site:${TARGET} filetype:sql OR filetype:log`, results: 7, urls: ['git.phantom.tech/db_backup.sql', 'api.phantom.tech/.env'] },
  { type: 'PHP Info', query: `site:${TARGET} intitle:"phpinfo()"`, results: 1, urls: ['test.phantom.tech/info.php'] },
  { type: 'Git Exposed', query: `site:${TARGET} ".git"`, results: 2, urls: ['git.phantom.tech/.git/config'] },
  { type: 'Backup Files', query: `site:${TARGET} ext:bak | ext:old`, results: 3, urls: ['backup.phantom.tech/data.old'] },
  { type: 'Open Redirects', query: `site:${TARGET} inurl:redirect= OR inurl:url=`, results: 4, urls: ['api.phantom.tech/auth?redirect=', 'phantom.tech/go?url='] },
];

export const certTransparency = [
  { id: '12345678', loggedAt: '2025-05-20', issuer: "Let's Encrypt R3", commonName: '*.phantom.tech', san: ['phantom.tech', '*.phantom.tech', 'admin.phantom.tech', 'api.phantom.tech'], notAfter: '2025-08-18' },
  { id: '12345679', loggedAt: '2025-04-15', issuer: 'Google Trust Services GTS CA 1D4', commonName: 'phantom.tech', san: ['phantom.tech'], notAfter: '2025-07-14' },
  { id: '12345680', loggedAt: '2024-12-01', issuer: "Let's Encrypt R3", commonName: 'vpn.phantom.tech', san: ['vpn.phantom.tech'], notAfter: '2025-03-01' },
];

export const waybackSnapshots = [
  { date: '2025-05-15', url: '/', finding: 'New homepage with updated team page — exposes 3 new employee names' },
  { date: '2024-12-01', url: '/admin', finding: '⚠️ Admin login exposed publicly (no auth gate) — since fixed' },
  { date: '2024-10-08', url: '/.env', finding: '🔴 .env file accessible: DB_PASS, API_KEY, STRIPE_SECRET leaked' },
  { date: '2024-06-20', url: '/backup.zip', finding: '🔴 Full site backup downloadable — contained source + credentials' },
  { date: '2023-01-01', url: '/phpinfo.php', finding: '⚠️ PHP info page exposing server config, extensions, env vars' },
];

export const socialIntel = [
  { platform: 'LinkedIn', name: 'John Doe', role: 'Senior Backend Engineer', url: 'linkedin.com/in/john-doe-phantom', intel: 'Python, Docker, AWS. GitHub: johndoe-dev. Likely manages API infra.' },
  { platform: 'LinkedIn', name: 'Jane Smith', role: 'DevOps Lead', url: 'linkedin.com/in/jane-smith-phantom', intel: 'Jenkins, K8s, Terraform user. Has commit access to terraform repo.' },
  { platform: 'LinkedIn', name: 'Mike Torres', role: 'CTO', url: 'linkedin.com/in/mike-torres-phantom', intel: 'Uses personal email miket@gmail.com for side projects — reuse risk.' },
  { platform: 'Twitter', name: '@phantomdev', role: 'Official Dev Account', url: 'twitter.com/phantomdev', intel: 'Tweets about stack updates. Mentioned Redis migration in Feb 2025.' },
  { platform: 'GitHub', name: 'phantom-security', role: 'GitHub Org', url: 'github.com/phantom-security', intel: '12 members visible. 3 repos public. Commit history reveals infra details.' },
];

// ── Color maps ────────────────────────────────────────────────────────────────
export const RISK_COLOR: Record<string, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#f5a623',
  low: '#30d158',
  none: '#636366',
};

export const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff6b35',
  MEDIUM: '#f5a623',
  LOW: '#30d158',
};

// ── Shared UI components ──────────────────────────────────────────────────────
export function RiskPill({ level, children }: { level: string; children?: React.ReactNode }) {
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

export function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 bg-[#0d1017] border border-[#1c2333] rounded">
      <div className="text-[9px] uppercase tracking-[0.1em] text-[#3a4558] font-mono">{label}</div>
      <div className="text-[18px] font-bold font-mono leading-none" style={{ color: accent ?? '#c8d6f0' }}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-[#3a4558]">{sub}</div>}
    </div>
  );
}

export function SectionHeader({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-3 rounded-full" style={{ background: accent ?? '#0af' }} />
      <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#4a5a7a]">
        {children}
      </span>
    </div>
  );
}

export function KV({ k, v, vc }: { k: string; v: string; vc?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-[3px] border-b border-[#111827] last:border-0">
      <span className="text-[9.5px] text-[#3a4558] font-mono shrink-0">{k}</span>
      <span className={cn('text-[10px] font-mono text-right break-all', vc ?? 'text-[#8da0c0]')}>{v}</span>
    </div>
  );
}

export function RiskRadar({ data }: { data: Record<string, number> }) {
  const keys = Object.keys(data);
  const cx = 80, cy = 80, r = 60;
  const n = keys.length;
  const pts = keys.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const val = data[keys[i]] / 100;
    return { x: cx + Math.cos(angle) * r * val, y: cy + Math.sin(angle) * r * val, lx: cx + Math.cos(angle) * (r + 14), ly: cy + Math.sin(angle) * (r + 14) };
  });
  const gridPts = (scale: number) => keys.map((_, i) => { const angle = (i / n) * Math.PI * 2 - Math.PI / 2; return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`; }).join(' ');
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {[0.25, 0.5, 0.75, 1].map((s) => <polygon key={s} points={gridPts(s)} fill="none" stroke="#1c2333" strokeWidth="0.5" />)}
      {keys.map((_, i) => { const angle = (i / n) * Math.PI * 2 - Math.PI / 2; return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} stroke="#1c2333" strokeWidth="0.5" />; })}
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(0,170,255,0.12)" stroke="#0af" strokeWidth="1" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2" fill="#0af" />)}
      {pts.map((p, i) => <text key={i} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#4a5a7a" fontFamily="monospace">{keys[i].toUpperCase()}</text>)}
    </svg>
  );
}

export function CvssBar({ score, cve }: { score: number; cve: string }) {
  const color = score >= 9 ? '#ff2d55' : score >= 7 ? '#ff6b35' : score >= 4 ? '#f5a623' : '#30d158';
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className="text-[9px] font-mono text-[#4a5a7a] w-32 shrink-0">{cve}</span>
      <div className="flex-1 h-[3px] bg-[#111827] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(score / 10) * 100}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold font-mono w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export function PortMatrix() {
  return (
    <div className="grid grid-cols-2 gap-1">
      {ports.map((p) => {
        const c = RISK_COLOR[p.risk];
        return (
          <div key={p.port} className="flex items-center gap-2 p-1.5 rounded border" style={{ borderColor: `${c}25`, background: `${c}08` }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.state === 'open' ? c : '#636366' }} />
            <span className="font-mono text-[10px] font-bold w-10 shrink-0" style={{ color: c }}>{p.port}</span>
            <span className="text-[9px] text-[#4a5a7a] truncate">{p.service}</span>
            <span className="ml-auto text-[8px] text-[#2a3548] truncate">{p.product.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SubdomainTreemap() {
  return (
    <div className="grid grid-cols-4 gap-[3px]">
      {subdomains.map((s) => {
        const c = RISK_COLOR[s.risk];
        return (
          <div key={s.name} className="rounded p-1.5 flex flex-col gap-0.5 min-h-[44px] cursor-default group" style={{ background: `${c}10`, border: `1px solid ${c}25` }}>
            <div className="flex items-center justify-between">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              <span className="text-[8px] font-mono text-[#2a3548]">{s.status}</span>
            </div>
            <div className="text-[9.5px] font-mono font-bold truncate" style={{ color: c }}>{s.name}</div>
            <div className="text-[8px] text-[#2a3548] truncate group-hover:text-[#4a5a7a] transition-colors">{s.title}</div>
          </div>
        );
      })}
    </div>
  );
}

export function BreachTimeline() {
  const sorted = [...breaches].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="relative pl-4">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[#1c2333]" />
      {sorted.map((b, i) => (
        <div key={i} className="relative mb-3 last:mb-0">
          <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full border border-current" style={{ color: SEVERITY_COLOR[b.severity], background: `${SEVERITY_COLOR[b.severity]}30` }} />
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-mono text-[#3a4558]">{b.date}</span>
            <RiskPill level={b.severity.toLowerCase()} />
          </div>
          <div className="text-[10.5px] font-semibold text-[#8da0c0]">{b.name}</div>
          <div className="text-[9.5px] text-[#3a4558] mt-0.5">{b.accounts.toLocaleString()} accounts · {b.categories.join(', ')}</div>
        </div>
      ))}
    </div>
  );
}

export function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#ff2d55' : score >= 60 ? '#ff6b35' : score >= 40 ? '#f5a623' : '#30d158';
  const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 88 88" className="w-24 h-24">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#111827" strokeWidth="6" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 44 44)" />
        <text x="44" y="40" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color} fontFamily="monospace">{score}</text>
        <text x="44" y="54" textAnchor="middle" fontSize="8" fill="#3a4558" fontFamily="monospace">RISK</text>
      </svg>
    </div>
  );
}

export function HeatBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#ff2d55' : value >= 60 ? '#ff6b35' : value >= 40 ? '#f5a623' : '#30d158';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-[#3a4558] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-[5px] bg-[#111827] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-7 text-right" style={{ color }}>{value}</span>
    </div>
  );
}
