// src/renderer/src/features/Tool/components/WorkspaceSection/Vulns/index.tsx
// ============================================================================
// GHOST PROTOCOL — VULNERABILITY INTELLIGENCE DASHBOARD
// Aesthetic: Terminal-noir · Tactical Security Panel
// ============================================================================
import { useState, useMemo } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  ModuleTabBar,
  ToolbarButton,
  KVRow,
  ActionButton,
  SeverityPill,
} from '../../../../../core/components/ui';

// ============================================================================
// 1. TYPES & MOCK DATA
// ============================================================================

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Exploitability = 'EASY' | 'MODERATE' | 'HARD';

interface Vulnerability {
  id: string;
  name: string;
  cve: string;
  severity: SeverityLevel;
  cvss: number;
  description: string;
  target: string;
  port: number;
  component: string;
  impact: string;
  remediation: string;
  references: string[];
  exploitability: Exploitability;
  published: string;
  inTheWild: boolean;
  epss: number;
  vector: string;
  category: string;
  hasMetasploit: boolean;
  hasPOC: boolean;
  patchAvailable: boolean;
}

const mockVulns: Vulnerability[] = [
  {
    id: '1',
    name: 'Log4Shell — JNDI Remote Code Execution',
    cve: 'CVE-2021-44228',
    severity: 'CRITICAL',
    cvss: 10.0,
    description:
      'Unauthenticated RCE via JNDI injection in Apache Log4j 2.x. Exploitable via any log-controlled user input such as User-Agent, X-Forwarded-For, or username fields.',
    target: '192.168.1.20',
    port: 8080,
    component: 'Apache Log4j 2.14.1',
    impact: 'Complete system compromise, persistent backdoor, lateral movement, data exfiltration',
    remediation:
      'Upgrade Log4j to ≥ 2.17.0. Set LOG4J_FORMAT_MSG_NO_LOOKUPS=true as interim mitigation. Remove JndiLookup class from classpath.',
    references: [
      'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
      'https://www.lunasec.io/docs/blog/log4j-zero-day/',
    ],
    exploitability: 'EASY',
    published: '2021-12-10',
    inTheWild: true,
    epss: 0.974,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    category: 'RCE',
    hasMetasploit: true,
    hasPOC: true,
    patchAvailable: true,
  },
  {
    id: '2',
    name: 'EternalBlue — SMBv1 Remote Code Execution',
    cve: 'MS17-010',
    severity: 'CRITICAL',
    cvss: 9.8,
    description:
      'SMBv1 buffer overflow allowing unauthenticated RCE as SYSTEM. Exploited by WannaCry & NotPetya. Self-propagating worm vector.',
    target: '192.168.1.10',
    port: 445,
    component: 'Windows SMBv1 (srv.sys)',
    impact: 'Remote code execution as SYSTEM, wormable lateral movement across flat networks',
    remediation:
      'Apply KB4013389. Disable SMBv1 via: Set-SmbServerConfiguration -EnableSMB1Protocol $false. Block port 445 at perimeter.',
    references: ['https://msrc.microsoft.com/update-guide/vulnerability/MS17-010'],
    exploitability: 'EASY',
    published: '2017-03-14',
    inTheWild: true,
    epss: 0.987,
    vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    category: 'RCE',
    hasMetasploit: true,
    hasPOC: true,
    patchAvailable: true,
  },
  {
    id: '3',
    name: 'Redis — Unauthenticated RCE via Lua Sandbox Escape',
    cve: 'CVE-2022-0543',
    severity: 'CRITICAL',
    cvss: 10.0,
    description:
      'Debian/Ubuntu Redis packages expose a Lua sandbox escape. Attacker with ability to run EVAL commands can escape the sandbox and execute arbitrary code on the host OS.',
    target: '192.168.1.20',
    port: 6379,
    component: 'Redis 7.0.5 (Debian)',
    impact: 'Full host RCE as redis user, privilege escalation via SUID binaries',
    remediation:
      'Upgrade redis-server package. Require authentication (requirepass). Bind to 127.0.0.1 only. Use protected-mode yes.',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2022-0543'],
    exploitability: 'EASY',
    published: '2022-02-18',
    inTheWild: true,
    epss: 0.961,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    category: 'RCE',
    hasMetasploit: true,
    hasPOC: true,
    patchAvailable: true,
  },
  {
    id: '4',
    name: 'Jenkins — Unauthenticated Authentication Bypass',
    cve: 'CVE-2023-27898',
    severity: 'CRITICAL',
    cvss: 9.1,
    description:
      'Jenkins 2.401.1 allows unauthenticated attackers to read arbitrary files and execute code via crafted HTTP requests to the Stapler routing layer.',
    target: '192.168.1.20',
    port: 8080,
    component: 'Jenkins 2.401.1',
    impact: 'Pipeline compromise, source code exfiltration, supply chain attack vector',
    remediation:
      'Upgrade to Jenkins 2.401.2 or 2.414.1 LTS. Enable matrix-based security. Restrict to localhost + VPN.',
    references: ['https://www.jenkins.io/security/advisory/2023-06-14/'],
    exploitability: 'EASY',
    published: '2023-06-21',
    inTheWild: true,
    epss: 0.962,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    category: 'Auth Bypass',
    hasMetasploit: false,
    hasPOC: true,
    patchAvailable: true,
  },
  {
    id: '5',
    name: 'OpenSSH — Pre-Auth Remote Code Execution',
    cve: 'CVE-2023-38408',
    severity: 'CRITICAL',
    cvss: 9.8,
    description:
      'OpenSSH ssh-agent forwarding vulnerable to RCE. Malicious server can inject agent responses when victim connects via forwarded agent socket.',
    target: '192.168.1.20',
    port: 22,
    component: 'OpenSSH 8.9p1',
    impact: 'Full RCE on client machine that has ssh-agent forwarding enabled, credential theft',
    remediation:
      'Upgrade openssh-server ≥ 8.9p1-3ubuntu0.5. Disable ForwardAgent in ssh_config. Use ProxyJump instead.',
    references: ['https://www.qualys.com/2023/07/19/cve-2023-38408/'],
    exploitability: 'MODERATE',
    published: '2023-07-19',
    inTheWild: true,
    epss: 0.93,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    category: 'RCE',
    hasMetasploit: false,
    hasPOC: true,
    patchAvailable: true,
  },
  {
    id: '6',
    name: 'SQL Injection — Login Authentication Bypass',
    cve: 'CWE-89',
    severity: 'HIGH',
    cvss: 8.1,
    description:
      "UNION-based SQLi confirmed in /api/v1/login parameter 'username'. DB fingerprinted as MySQL 5.7. Full authentication bypass via ' OR '1'='1 payload.",
    target: 'target.corp.local',
    port: 443,
    component: 'PHP 7.4.33 + MySQL 5.7',
    impact: 'Authentication bypass, full database read, user credential extraction',
    remediation:
      'Use PDO prepared statements. Implement input validation. Apply principle of least privilege on DB user.',
    references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
    exploitability: 'EASY',
    published: '2024-02-01',
    inTheWild: true,
    epss: 0.82,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    category: 'Injection',
    hasMetasploit: false,
    hasPOC: false,
    patchAvailable: false,
  },
  {
    id: '7',
    name: 'BusyBox telnetd — Remote Code Execution',
    cve: 'CVE-2022-30065',
    severity: 'HIGH',
    cvss: 8.9,
    description:
      'BusyBox telnetd 1.33.2 vulnerable to heap overflow via specially crafted telnet option sequence. Unauthenticated RCE on affected IoT device.',
    target: '192.168.1.30',
    port: 23,
    component: 'BusyBox telnetd 1.33.2',
    impact: 'Remote code execution as root on embedded device, persistent implant',
    remediation:
      'Disable telnet, use SSH instead. Upgrade busybox to ≥ 1.34.0. Block port 23 at perimeter.',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2022-30065'],
    exploitability: 'MODERATE',
    published: '2022-06-21',
    inTheWild: true,
    epss: 0.77,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    category: 'RCE',
    hasMetasploit: false,
    hasPOC: true,
    patchAvailable: true,
  },
  {
    id: '8',
    name: 'Stored XSS — WordPress Admin Comment Field',
    cve: 'CWE-79',
    severity: 'HIGH',
    cvss: 7.5,
    description:
      'Stored XSS in blog comment field. Injected JS executes in admin context on /wp-admin/edit-comments.php. No CSP header present. WordPress 5.9.3.',
    target: 'target.corp.local',
    port: 443,
    component: 'WordPress 5.9.3',
    impact: 'Admin session hijacking, credential theft, WordPress backdoor installation',
    remediation:
      'Upgrade WordPress. Implement strict CSP. Use HTMLPurifier for input sanitization. Output encode all user data.',
    references: ['https://owasp.org/www-community/attacks/xss/'],
    exploitability: 'MODERATE',
    published: '2024-03-10',
    inTheWild: true,
    epss: 0.65,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N',
    category: 'XSS',
    hasMetasploit: false,
    hasPOC: false,
    patchAvailable: true,
  },
  {
    id: '9',
    name: 'Default Credentials — Jenkins CI/CD',
    cve: 'CWE-521',
    severity: 'MEDIUM',
    cvss: 6.2,
    description:
      'Jenkins accessible with factory-default admin:admin credentials. Full build configuration, pipeline read/write, plugin installation, code deployment access.',
    target: 'jenkins.target.corp.local',
    port: 8080,
    component: 'Jenkins 2.375',
    impact: 'Unauthorized CI/CD access, source code exposure, supply chain compromise vector',
    remediation:
      'Force credential rotation. Enable RBAC + MFA. Restrict Jenkins to internal network. Audit installed plugins.',
    references: [],
    exploitability: 'EASY',
    published: '2024-01-05',
    inTheWild: true,
    epss: 0.71,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
    category: 'Credential',
    hasMetasploit: false,
    hasPOC: false,
    patchAvailable: false,
  },
  {
    id: '10',
    name: 'IDOR — User Profile Data Exposure',
    cve: 'CWE-639',
    severity: 'MEDIUM',
    cvss: 5.4,
    description:
      'Sequential user IDs at /api/v1/users/{id}. No ownership check — any authenticated user can access any other user record. Confirmed on IDs 1–50000.',
    target: 'api.target.corp.local',
    port: 443,
    component: 'Node.js + Express REST API',
    impact: 'Mass enumeration of PII (email, phone, role, address) for all registered users',
    remediation:
      'Enforce ownership checks server-side. Replace sequential IDs with UUIDs. Implement rate limiting on enumerable endpoints.',
    references: ['https://owasp.org/www-project-web-security-testing-guide/'],
    exploitability: 'EASY',
    published: '2024-04-22',
    inTheWild: false,
    epss: 0.42,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N',
    category: 'IDOR',
    hasMetasploit: false,
    hasPOC: false,
    patchAvailable: false,
  },
  {
    id: '11',
    name: 'MySQL Anonymous Login Enabled',
    cve: 'CWE-284',
    severity: 'MEDIUM',
    cvss: 5.8,
    description:
      'MySQL 8.0.33 allows anonymous login with empty password. Attacker can enumerate databases and query accessible tables without credentials.',
    target: '192.168.1.20',
    port: 3306,
    component: 'MySQL 8.0.33',
    impact: 'Unauthorized database read access, schema enumeration, information disclosure',
    remediation:
      "DELETE FROM mysql.user WHERE User=''; FLUSH PRIVILEGES; Enable require_secure_transport.",
    references: [],
    exploitability: 'EASY',
    published: '2024-02-10',
    inTheWild: false,
    epss: 0.38,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    category: 'Credential',
    hasMetasploit: false,
    hasPOC: false,
    patchAvailable: false,
  },
  {
    id: '12',
    name: 'Elasticsearch — Unauthenticated Data Access',
    cve: 'CWE-306',
    severity: 'LOW',
    cvss: 3.7,
    description:
      'Elasticsearch 8.5.0 running without X-Pack security. All indices accessible via HTTP REST API without authentication from internal network.',
    target: '192.168.1.20',
    port: 9200,
    component: 'Elasticsearch 8.5.0',
    impact: 'Index enumeration, full data read from all indices on internal network',
    remediation:
      'Enable X-Pack Security. Set xpack.security.enabled: true. Bind to localhost or VPN interface only.',
    references: [],
    exploitability: 'EASY',
    published: '2024-03-01',
    inTheWild: false,
    epss: 0.18,
    vector: 'CVSS:3.1/AV:A/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N',
    category: 'Auth Missing',
    hasMetasploit: false,
    hasPOC: false,
    patchAvailable: false,
  },
];

const cveSearchResults = [
  {
    cve: 'CVE-2024-38812',
    description: 'Apache Tomcat HTTP/2 request smuggling allows backend bypass',
    published: '2024-05-15',
    cvss: 7.5,
    severity: 'HIGH' as SeverityLevel,
    product: 'Tomcat 9.0.80',
    epss: 0.44,
  },
  {
    cve: 'CVE-2024-21413',
    description: 'Microsoft Outlook MSHTML RCE via malicious email link preview',
    published: '2024-02-13',
    cvss: 9.8,
    severity: 'CRITICAL' as SeverityLevel,
    product: 'Outlook 2016+',
    epss: 0.71,
  },
  {
    cve: 'CVE-2024-3400',
    description: 'Palo Alto GlobalProtect OS command injection via crafted session ID',
    published: '2024-04-12',
    cvss: 10.0,
    severity: 'CRITICAL' as SeverityLevel,
    product: 'PAN-OS 11.0',
    epss: 0.97,
  },
  {
    cve: 'CVE-2024-6387',
    description: 'OpenSSH regreSSHion — race condition in sigalrm handler allows RCE',
    published: '2024-07-01',
    cvss: 8.1,
    severity: 'HIGH' as SeverityLevel,
    product: 'OpenSSH < 9.8',
    epss: 0.88,
  },
  {
    cve: 'CVE-2024-23897',
    description: 'Jenkins CLI path traversal arbitrary file read via args4j',
    published: '2024-01-24',
    cvss: 9.8,
    severity: 'CRITICAL' as SeverityLevel,
    product: 'Jenkins < 2.442',
    epss: 0.95,
  },
];

const reports = [
  {
    id: 'RPT-001',
    name: 'Executive Summary — CyberCorp Q2',
    date: '2025-05-20',
    findings: 27,
    critical: 3,
    high: 7,
    medium: 12,
    low: 5,
    status: 'Final',
  },
  {
    id: 'RPT-002',
    name: 'Full Technical Appendix — Internal Scan',
    date: '2025-05-15',
    findings: 142,
    critical: 8,
    high: 23,
    medium: 45,
    low: 66,
    status: 'Draft',
  },
  {
    id: 'RPT-003',
    name: 'Remediation Roadmap — Priority Matrix',
    date: '2025-05-10',
    findings: 27,
    critical: 3,
    high: 7,
    medium: 12,
    low: 5,
    status: 'Final',
  },
  {
    id: 'RPT-004',
    name: 'Red Team Assessment — Network Segment B',
    date: '2025-04-28',
    findings: 54,
    critical: 11,
    high: 18,
    medium: 16,
    low: 9,
    status: 'Final',
  },
];

// ============================================================================
// 2. DESIGN TOKENS
// ============================================================================
const SEV_COLOR: Record<SeverityLevel, string> = {
  CRITICAL: '#c084fc',
  HIGH: '#ff3b5c',
  MEDIUM: '#ffaa00',
  LOW: '#00d4ff',
};
const SEV_BG: Record<SeverityLevel, string> = {
  CRITICAL: 'rgba(192,132,252,0.08)',
  HIGH: 'rgba(255,59,92,0.08)',
  MEDIUM: 'rgba(255,170,0,0.08)',
  LOW: 'rgba(0,212,255,0.08)',
};
const SEV_STROKE: Record<SeverityLevel, string> = {
  CRITICAL: '#c084fc',
  HIGH: '#ff3b5c',
  MEDIUM: '#ffaa00',
  LOW: '#00d4ff',
};
const CAT_COLOR: Record<string, string> = {
  RCE: '#ff3b5c',
  Injection: '#ff6b35',
  XSS: '#f5a623',
  'Auth Bypass': '#c084fc',
  Credential: '#00d4ff',
  IDOR: '#30d158',
  'Auth Missing': '#4a9eff',
};

// ============================================================================
// 3. SHARED SMALL COMPONENTS
// ============================================================================

function SectionDivider({ label, accent = '#3d4a61' }: { label: string; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <div className="w-0.5 h-3 rounded-full" style={{ background: accent }} />
      <span
        className="text-[8.5px] font-bold tracking-[0.14em] uppercase font-mono"
        style={{ color: accent }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, ${accent}40, transparent)` }}
      />
    </div>
  );
}

function MiniPill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center text-[8px] font-bold font-mono px-1.5 py-px rounded-sm tracking-wider uppercase"
      style={{ color, border: `1px solid ${color}35`, background: `${color}10` }}
    >
      {children}
    </span>
  );
}

function TogglePill({
  label,
  active,
  color,
  count,
  onClick,
}: {
  label: SeverityLevel;
  active: boolean;
  color: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] font-bold font-mono uppercase tracking-wider transition-all"
      style={{
        background: active ? `${color}15` : 'transparent',
        border: `1px solid ${active ? color + '50' : '#1e2535'}`,
        color: active ? color : '#3d4a61',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: active ? color : '#252e42' }}
      />
      {label}
      <span
        className="ml-0.5 px-1 rounded-sm"
        style={{ background: active ? `${color}20` : '#111520', color: active ? color : '#3d4a61' }}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// 4. SVG CHARTS
// ============================================================================

function CvssGauge({ score, severity }: { score: number; severity: SeverityLevel }) {
  const c = SEV_STROKE[severity];
  const r = 30,
    circ = 2 * Math.PI * r;
  const dash = (score / 10) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg viewBox="0 0 72 72" className="w-[68px] h-[68px]">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#151d2e" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={c}
          strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ filter: `drop-shadow(0 0 5px ${c}90)` }}
        />
        <text
          x="36"
          y="32"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill={c}
          fontFamily="monospace"
        >
          {score}
        </text>
        <text x="36" y="44" textAnchor="middle" fontSize="6" fill="#3d4a61" fontFamily="monospace">
          CVSS 3.1
        </text>
      </svg>
    </div>
  );
}

function EpssBar({ value }: { value: number }) {
  const pct = value * 100;
  const color = pct >= 80 ? '#ff3b5c' : pct >= 50 ? '#ffaa00' : pct >= 20 ? '#00d4ff' : '#30d158';
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-1 h-[4px] rounded-full overflow-hidden"
        style={{ background: '#151d2e' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>
      <span className="text-[9px] font-bold font-mono w-9 text-right" style={{ color }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function SeverityDonut({ vulns }: { vulns: Vulnerability[] }) {
  const counts = {
    CRITICAL: vulns.filter((v) => v.severity === 'CRITICAL').length,
    HIGH: vulns.filter((v) => v.severity === 'HIGH').length,
    MEDIUM: vulns.filter((v) => v.severity === 'MEDIUM').length,
    LOW: vulns.filter((v) => v.severity === 'LOW').length,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const r = 32,
    circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = (Object.keys(counts) as SeverityLevel[]).map((sev) => {
    const dash = (counts[sev] / total) * circ;
    const seg = { sev, count: counts[sev], dash, offset };
    offset += dash + 1.5; // small gap
    return seg;
  });
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 80" className="w-16 h-16 shrink-0">
        {segs.map((s) => (
          <circle
            key={s.sev}
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={SEV_COLOR[s.sev]}
            strokeWidth="9"
            strokeDasharray={`${s.dash} ${circ}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 40 40)"
            strokeLinecap="butt"
          />
        ))}
        <text
          x="40"
          y="37"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="#c5cfe0"
          fontFamily="monospace"
        >
          {total}
        </text>
        <text
          x="40"
          y="48"
          textAnchor="middle"
          fontSize="5.5"
          fill="#3d4a61"
          fontFamily="monospace"
        >
          TOTAL
        </text>
      </svg>
      <div className="flex flex-col gap-0.5">
        {(Object.keys(counts) as SeverityLevel[]).map((sev) => (
          <div key={sev} className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-sm shrink-0"
              style={{ background: SEV_COLOR[sev] }}
            />
            <span className="text-[8.5px] font-mono w-14" style={{ color: SEV_COLOR[sev] }}>
              {sev}
            </span>
            <span className="text-[9px] font-bold font-mono" style={{ color: SEV_COLOR[sev] }}>
              {counts[sev]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBar({ vulns }: { vulns: Vulnerability[] }) {
  const cats = useMemo(() => {
    const m: Record<string, number> = {};
    vulns.forEach((v) => {
      m[v.category] = (m[v.category] ?? 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [vulns]);
  const max = cats[0]?.[1] ?? 1;
  return (
    <div className="space-y-[5px]">
      {cats.map(([cat, count]) => {
        const c = CAT_COLOR[cat] ?? '#4a5a7a';
        return (
          <div key={cat} className="flex items-center gap-2">
            <span className="text-[8.5px] font-mono w-20 shrink-0" style={{ color: c }}>
              {cat}
            </span>
            <div
              className="flex-1 h-[4px] rounded-full overflow-hidden"
              style={{ background: '#151d2e' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${(count / max) * 100}%`, background: c }}
              />
            </div>
            <span className="text-[8.5px] font-mono w-4 text-right" style={{ color: c }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EpssScatterPlot({ vulns }: { vulns: Vulnerability[] }) {
  const W = 220,
    H = 90;
  const px = (v: Vulnerability) => v.epss * (W - 16) + 8;
  const py = (v: Vulnerability) => H - (v.cvss / 10) * (H - 16) - 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* grid */}
      {[0.25, 0.5, 0.75].map((x) => (
        <line
          key={x}
          x1={x * (W - 16) + 8}
          y1="4"
          x2={x * (W - 16) + 8}
          y2={H - 4}
          stroke="#151d2e"
          strokeWidth="0.5"
        />
      ))}
      {[3, 5, 7, 9].map((y) => {
        const yy = H - (y / 10) * (H - 16) - 8;
        return (
          <line key={y} x1="8" y1={yy} x2={W - 8} y2={yy} stroke="#151d2e" strokeWidth="0.5" />
        );
      })}
      {/* axis labels */}
      <text
        x={W / 2}
        y={H - 1}
        textAnchor="middle"
        fontSize="5"
        fill="#252e42"
        fontFamily="monospace"
      >
        EPSS →
      </text>
      <text
        x="3"
        y={H / 2}
        textAnchor="middle"
        fontSize="5"
        fill="#252e42"
        fontFamily="monospace"
        transform={`rotate(-90, 3, ${H / 2})`}
      >
        CVSS
      </text>
      {/* dots */}
      {vulns.map((v) => (
        <g key={v.id}>
          <circle
            cx={px(v)}
            cy={py(v)}
            r="3.5"
            fill={`${SEV_COLOR[v.severity]}30`}
            stroke={SEV_COLOR[v.severity]}
            strokeWidth="0.8"
            style={{ filter: `drop-shadow(0 0 3px ${SEV_COLOR[v.severity]}80)` }}
          />
          {v.hasMetasploit && <circle cx={px(v)} cy={py(v)} r="1.5" fill={SEV_COLOR[v.severity]} />}
        </g>
      ))}
    </svg>
  );
}

// ============================================================================
// 5. VULN DETAIL PANEL
// ============================================================================

function VulnDetailPanel({ vuln }: { vuln: Vulnerability }) {
  return (
    <div
      className="flex flex-col bg-[#0c1018] overflow-hidden"
      style={{ width: '34%', minWidth: 260, borderLeft: '1px solid #1e2535' }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 h-8 shrink-0"
        style={{ background: '#0a0e16', borderBottom: '1px solid #1e2535' }}
      >
        <span className="text-[9px] font-bold tracking-[0.12em] uppercase font-mono text-[#3d4a61]">
          Vuln Detail
        </span>
        <MiniPill color={SEV_COLOR[vuln.severity]}>{vuln.severity}</MiniPill>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
        {/* CVSS gauge + name */}
        <div className="flex items-start gap-3">
          <CvssGauge score={vuln.cvss} severity={vuln.severity} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold leading-tight mb-1" style={{ color: '#c5cfe0' }}>
              {vuln.name}
            </div>
            <div className="text-[9px] font-mono mb-1" style={{ color: '#00d4ff' }}>
              {vuln.cve}
            </div>
            <div className="flex flex-wrap gap-1">
              {vuln.hasMetasploit && <MiniPill color="#c084fc">MSF</MiniPill>}
              {vuln.hasPOC && <MiniPill color="#ff3b5c">POC</MiniPill>}
              {vuln.inTheWild && <MiniPill color="#ff6b35">In Wild</MiniPill>}
              {vuln.patchAvailable && <MiniPill color="#30d158">Patch</MiniPill>}
            </div>
          </div>
        </div>

        {/* EPSS */}
        <div>
          <SectionDivider label="Exploit Probability (EPSS)" accent="#3d4a61" />
          <EpssBar value={vuln.epss} />
          <div className="text-[8px] font-mono mt-0.5" style={{ color: '#252e42' }}>
            {vuln.epss >= 0.9
              ? 'Very High — exploitation very likely in 30 days'
              : vuln.epss >= 0.5
                ? 'High — active exploitation expected'
                : 'Moderate — monitor closely'}
          </div>
        </div>

        {/* Identifiers */}
        <div>
          <SectionDivider label="Identifiers" accent="#3d4a61" />
          <KVRow label="CVE" value={vuln.cve} valueColor="text-cyan-400" />
          <KVRow label="Category" value={vuln.category} />
          <KVRow label="Published" value={vuln.published} />
          <KVRow
            label="In the wild"
            value={vuln.inTheWild ? '✓ Active exploitation' : '✗ Not observed'}
            valueColor={vuln.inTheWild ? 'text-red-400' : 'text-green-400'}
          />
          <KVRow
            label="Exploitability"
            value={vuln.exploitability}
            valueColor={
              vuln.exploitability === 'EASY'
                ? 'text-red-400'
                : vuln.exploitability === 'MODERATE'
                  ? 'text-amber-400'
                  : 'text-green-400'
            }
          />
        </div>

        {/* Target */}
        <div>
          <SectionDivider label="Target" accent="#3d4a61" />
          <KVRow label="Host" value={vuln.target} />
          <KVRow label="Port" value={`${vuln.port}`} />
          <KVRow label="Component" value={vuln.component} />
        </div>

        {/* CVSS Vector */}
        <div>
          <SectionDivider label="CVSS Vector" accent="#3d4a61" />
          <div
            className="text-[8px] font-mono break-all leading-relaxed p-1.5 rounded"
            style={{ background: '#0a0e16', border: '1px solid #1e2535', color: '#3d4a61' }}
          >
            {vuln.vector}
          </div>
        </div>

        {/* Impact */}
        <div>
          <SectionDivider label="Impact" accent="#ff3b5c" />
          <p className="text-[9.5px] leading-relaxed" style={{ color: '#c5cfe0' }}>
            {vuln.impact}
          </p>
        </div>

        {/* Remediation */}
        <div>
          <SectionDivider label="Remediation" accent="#30d158" />
          <p className="text-[9.5px] leading-relaxed" style={{ color: '#30d158' }}>
            {vuln.remediation}
          </p>
        </div>

        {/* References */}
        {vuln.references.length > 0 && (
          <div>
            <SectionDivider label="References" accent="#3d4a61" />
            {vuln.references.map((ref, i) => (
              <div
                key={i}
                className="text-[8.5px] font-mono truncate mb-0.5"
                style={{ color: '#00d4ff' }}
              >
                › {ref}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div>
          <SectionDivider label="Actions" accent="#3d4a61" />
          <div className="grid grid-cols-2 gap-1">
            {[
              {
                label: '▶ Launch Exploit',
                variant: 'red' as const,
                enabled: vuln.hasMetasploit || vuln.hasPOC,
              },
              { label: '⬡ Open Metasploit', variant: 'cyan' as const, enabled: vuln.hasMetasploit },
              { label: '⊕ Post-Exploit', variant: 'purple' as const, enabled: true },
              { label: '+ Add to Report', variant: undefined, enabled: true },
            ].map((a, i) => (
              <button
                key={i}
                disabled={!a.enabled}
                className="py-1.5 rounded text-[8.5px] font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-30"
                style={{
                  background: a.enabled
                    ? a.variant === 'red'
                      ? 'rgba(255,59,92,0.12)'
                      : a.variant === 'cyan'
                        ? 'rgba(0,212,255,0.10)'
                        : a.variant === 'purple'
                          ? 'rgba(192,132,252,0.10)'
                          : 'rgba(255,255,255,0.04)'
                    : 'transparent',
                  border: `1px solid ${a.enabled ? (a.variant === 'red' ? 'rgba(255,59,92,0.35)' : a.variant === 'cyan' ? 'rgba(0,212,255,0.30)' : a.variant === 'purple' ? 'rgba(192,132,252,0.30)' : 'rgba(255,255,255,0.10)') : '#1e2535'}`,
                  color: a.enabled
                    ? a.variant === 'red'
                      ? '#ff3b5c'
                      : a.variant === 'cyan'
                        ? '#00d4ff'
                        : a.variant === 'purple'
                          ? '#c084fc'
                          : '#6b7a96'
                    : '#252e42',
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. VULN LIST ITEM
// ============================================================================

function VulnListItem({
  vuln,
  selected,
  onClick,
}: {
  vuln: Vulnerability;
  selected: boolean;
  onClick: () => void;
}) {
  const c = SEV_COLOR[vuln.severity];
  const catC = CAT_COLOR[vuln.category] ?? '#4a5a7a';
  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-2.5 px-2.5 py-2 cursor-pointer transition-all"
      style={{
        borderBottom: '1px solid #0f1319',
        background: selected ? `${c}08` : 'transparent',
        borderLeft: `2px solid ${selected ? c : 'transparent'}`,
      }}
    >
      {/* Left: severity indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
        <div
          className="w-2 h-2 rounded-sm"
          style={{ background: c, boxShadow: selected ? `0 0 6px ${c}` : undefined }}
        />
        <div
          className="text-[7px] font-mono font-bold"
          style={{
            color: vuln.cvss >= 9 ? c : '#252e42',
            writingMode: 'vertical-rl' as const,
            transform: 'rotate(180deg)',
          }}
        >
          {vuln.cvss}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[10.5px] font-semibold truncate"
            style={{ color: selected ? '#e8f0ff' : '#8da0c0' }}
          >
            {vuln.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[8.5px] font-mono" style={{ color: '#00d4ff' }}>
            {vuln.cve}
          </span>
          <span className="text-[#1e2535]">·</span>
          <span className="text-[8px] font-mono truncate" style={{ color: catC }}>
            {vuln.category}
          </span>
          <span className="text-[#1e2535]">·</span>
          <span className="text-[8px] font-mono truncate" style={{ color: '#252e42' }}>
            {vuln.target}:{vuln.port}
          </span>
        </div>
        {/* Progress bar: EPSS */}
        <div className="flex items-center gap-1.5">
          <span className="text-[7.5px] font-mono w-8 shrink-0" style={{ color: '#252e42' }}>
            EPSS
          </span>
          <div
            className="flex-1 h-[2px] rounded-full overflow-hidden"
            style={{ background: '#0f1319' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${vuln.epss * 100}%`, background: c }}
            />
          </div>
          <div className="flex items-center gap-1 ml-1">
            {vuln.hasMetasploit && (
              <span className="text-[7px] font-mono" style={{ color: '#c084fc' }}>
                MSF
              </span>
            )}
            {vuln.inTheWild && (
              <span className="text-[7px] font-mono" style={{ color: '#ff3b5c' }}>
                WILD
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. TABS
// ============================================================================

function TabVulnerabilities({ vulns }: { vulns: Vulnerability[] }) {
  const [selectedId, setSelectedId] = useState(vulns[0].id);
  const [filters, setFilters] = useState<Record<SeverityLevel, boolean>>({
    CRITICAL: true,
    HIGH: true,
    MEDIUM: true,
    LOW: true,
  });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'cvss' | 'epss' | 'severity'>('cvss');

  const counts = useMemo(
    () => ({
      CRITICAL: vulns.filter((v) => v.severity === 'CRITICAL').length,
      HIGH: vulns.filter((v) => v.severity === 'HIGH').length,
      MEDIUM: vulns.filter((v) => v.severity === 'MEDIUM').length,
      LOW: vulns.filter((v) => v.severity === 'LOW').length,
    }),
    [vulns],
  );

  const filtered = useMemo(() => {
    return vulns
      .filter((v) => filters[v.severity])
      .filter(
        (v) =>
          !search ||
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.cve.toLowerCase().includes(search.toLowerCase()) ||
          v.target.includes(search),
      )
      .sort((a, b) =>
        sortBy === 'cvss' ? b.cvss - a.cvss : sortBy === 'epss' ? b.epss - a.epss : 0,
      );
  }, [vulns, filters, search, sortBy]);

  const selected = vulns.find((v) => v.id === selectedId) ?? vulns[0];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: stats + list */}
      <div className="flex flex-col overflow-hidden" style={{ flex: 1 }}>
        {/* Stats strip */}
        <div
          className="flex items-stretch gap-px shrink-0"
          style={{ background: '#0a0e16', borderBottom: '1px solid #1e2535' }}
        >
          {/* Donut */}
          <div className="px-3 py-2">
            <SeverityDonut vulns={vulns} />
          </div>
          {/* Separator */}
          <div className="w-px bg-[#1e2535]" />
          {/* Category bars */}
          <div className="flex-1 px-3 py-2">
            <div
              className="text-[8px] font-mono mb-1.5 tracking-[0.1em]"
              style={{ color: '#252e42' }}
            >
              CATEGORY BREAKDOWN
            </div>
            <CategoryBar vulns={vulns} />
          </div>
          {/* Separator */}
          <div className="w-px bg-[#1e2535]" />
          {/* EPSS scatter */}
          <div className="px-3 py-2" style={{ width: 240 }}>
            <div
              className="text-[8px] font-mono mb-1.5 tracking-[0.1em]"
              style={{ color: '#252e42' }}
            >
              EPSS vs CVSS
            </div>
            <div className="h-20">
              <EpssScatterPlot vulns={vulns} />
            </div>
          </div>
        </div>

        {/* Filter + search bar */}
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 shrink-0"
          style={{ background: '#0a0e16', borderBottom: '1px solid #1e2535' }}
        >
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SeverityLevel[]).map((sev) => (
            <TogglePill
              key={sev}
              label={sev}
              active={filters[sev]}
              color={SEV_COLOR[sev]}
              count={counts[sev]}
              onClick={() => setFilters((prev) => ({ ...prev, [sev]: !prev[sev] }))}
            />
          ))}
          <div className="flex-1" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CVE / host / name..."
            className="h-6 w-44 bg-[#111520] border border-[#1e2535] rounded text-[9.5px] px-2 outline-none font-mono"
            style={{ color: '#8da0c0' }}
          />
          <div className="flex gap-0.5">
            {(['cvss', 'epss', 'severity'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-bold transition-all"
                style={{
                  background: sortBy === s ? '#1e2535' : 'transparent',
                  border: `1px solid ${sortBy === s ? '#252e42' : 'transparent'}`,
                  color: sortBy === s ? '#8da0c0' : '#252e42',
                }}
              >
                ↓{s}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#0e131e' }}>
          {filtered.length === 0 ? (
            <div
              className="flex items-center justify-center h-20 text-[10px] font-mono"
              style={{ color: '#252e42' }}
            >
              No vulnerabilities match current filters
            </div>
          ) : (
            filtered.map((v) => (
              <VulnListItem
                key={v.id}
                vuln={v}
                selected={v.id === selectedId}
                onClick={() => setSelectedId(v.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      <VulnDetailPanel vuln={selected} />
    </div>
  );
}

function TabCVESearch() {
  const [query, setQuery] = useState('');
  const results =
    query.length >= 2
      ? cveSearchResults.filter(
          (r) =>
            r.cve.toLowerCase().includes(query.toLowerCase()) ||
            r.description.toLowerCase().includes(query.toLowerCase()) ||
            r.product.toLowerCase().includes(query.toLowerCase()),
        )
      : cveSearchResults;

  return (
    <div className="flex-1 overflow-y-auto p-3" style={{ background: '#080a0e' }}>
      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search CVE ID, description, or product..."
          className="flex-1 h-8 bg-[#111520] border border-[#1e2535] rounded text-[11px] px-3 outline-none font-mono"
          style={{ color: '#c5cfe0' }}
        />
        <ToolbarButton variant="cyan">Search NVD</ToolbarButton>
        <ToolbarButton>EPSS Lookup</ToolbarButton>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {results.map((r, i) => {
          const c = SEV_COLOR[r.severity];
          return (
            <div
              key={i}
              className="rounded-md overflow-hidden"
              style={{ background: '#111520', border: `1px solid #1e2535` }}
            >
              {/* Header row */}
              <div
                className="flex items-center gap-3 px-3 py-2"
                style={{ background: '#0e1320', borderBottom: '1px solid #1a2030' }}
              >
                <span className="font-mono text-[11.5px] font-bold" style={{ color: '#00d4ff' }}>
                  {r.cve}
                </span>
                <div className="w-px h-3 bg-[#1e2535]" />
                <span className="text-[9px] font-mono" style={{ color: '#3d4a61' }}>
                  {r.product}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[8.5px] font-mono" style={{ color: '#252e42' }}>
                    Published {r.published}
                  </span>
                  <MiniPill color={c}>{r.severity}</MiniPill>
                  <div
                    className="text-[10px] font-bold font-mono px-1.5 py-px rounded"
                    style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}
                  >
                    {r.cvss}
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="px-3 py-2">
                <p className="text-[10.5px] mb-2" style={{ color: '#8da0c0' }}>
                  {r.description}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[8.5px] font-mono" style={{ color: '#252e42' }}>
                      EPSS
                    </span>
                    <EpssBar value={r.epss} />
                  </div>
                  <ActionButton variant="cyan" size="sm">
                    Fetch Exploit
                  </ActionButton>
                  <ActionButton size="sm">Add to Workspace</ActionButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabReports() {
  return (
    <div className="flex-1 overflow-y-auto p-3" style={{ background: '#080a0e' }}>
      <div className="grid grid-cols-2 gap-2">
        {reports.map((report) => {
          const total = report.critical + report.high + report.medium + report.low;
          const bars = [
            { label: 'CRITICAL', val: report.critical, color: SEV_COLOR.CRITICAL },
            { label: 'HIGH', val: report.high, color: SEV_COLOR.HIGH },
            { label: 'MEDIUM', val: report.medium, color: SEV_COLOR.MEDIUM },
            { label: 'LOW', val: report.low, color: SEV_COLOR.LOW },
          ];
          return (
            <div
              key={report.id}
              className="rounded-md overflow-hidden"
              style={{ background: '#111520', border: '1px solid #1e2535' }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: '#0e1320', borderBottom: '1px solid #1a2030' }}
              >
                <span className="text-[9px] font-mono" style={{ color: '#3d4a61' }}>
                  {report.id}
                </span>
                <span
                  className="text-[11px] font-semibold flex-1 min-w-0 truncate"
                  style={{ color: '#00d4ff' }}
                >
                  {report.name}
                </span>
                <span
                  className="text-[8px] font-bold font-mono px-1.5 py-px rounded"
                  style={{
                    background:
                      report.status === 'Final' ? 'rgba(48,209,88,0.12)' : 'rgba(255,170,0,0.12)',
                    color: report.status === 'Final' ? '#30d158' : '#ffaa00',
                    border: `1px solid ${report.status === 'Final' ? 'rgba(48,209,88,0.3)' : 'rgba(255,170,0,0.3)'}`,
                  }}
                >
                  {report.status}
                </span>
                <span className="text-[8.5px] font-mono" style={{ color: '#252e42' }}>
                  {report.date}
                </span>
              </div>

              {/* Stacked bar */}
              <div className="px-3 pt-2.5 pb-1">
                <div className="flex rounded-full overflow-hidden h-[6px] mb-2">
                  {bars.map((b) => (
                    <div
                      key={b.label}
                      style={{ flex: b.val, background: b.color, opacity: b.val === 0 ? 0 : 1 }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {bars.map((b) => (
                    <div key={b.label} className="text-center">
                      <div className="text-[13px] font-bold font-mono" style={{ color: b.color }}>
                        {b.val}
                      </div>
                      <div className="text-[7.5px] font-mono" style={{ color: '#252e42' }}>
                        {b.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderTop: '1px solid #1a2030' }}
              >
                <span className="text-[9px] font-mono" style={{ color: '#3d4a61' }}>
                  {total} findings
                </span>
                <div className="flex-1" />
                <ActionButton size="sm" variant="cyan">
                  View
                </ActionButton>
                <ActionButton size="sm">PDF</ActionButton>
                <ActionButton size="sm">DOCX</ActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabExploitSuggestions({ vulns }: { vulns: Vulnerability[] }) {
  const suggestions = useMemo(
    () => [...vulns].filter((v) => v.inTheWild).sort((a, b) => b.epss - a.epss),
    [vulns],
  );

  return (
    <div className="flex-1 overflow-y-auto p-3" style={{ background: '#080a0e' }}>
      {/* Priority legend */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-md mb-2 text-[9px] font-mono"
        style={{ background: '#0e1320', border: '1px solid #1e2535', color: '#3d4a61' }}
      >
        <span>⊙ Sorted by EPSS (exploit probability)</span>
        <div className="w-px h-3 bg-[#1e2535]" />
        <span style={{ color: '#c084fc' }}>● MSF = Metasploit module available</span>
        <div className="w-px h-3 bg-[#1e2535]" />
        <span style={{ color: '#ff3b5c' }}>● POC = Public proof-of-concept</span>
      </div>

      <div className="space-y-1.5">
        {suggestions.map((v, i) => {
          const c = SEV_COLOR[v.severity];
          return (
            <div
              key={v.id}
              className="rounded-md overflow-hidden flex"
              style={{ background: '#111520', border: `1px solid #1e2535` }}
            >
              {/* Rank strip */}
              <div
                className="flex items-center justify-center font-mono text-[10px] font-bold w-7 shrink-0"
                style={{ background: `${c}08`, borderRight: `1px solid ${c}20`, color: c }}
              >
                {i + 1}
              </div>
              {/* Body */}
              <div className="flex-1 px-2.5 py-2 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MiniPill color={c}>{v.severity}</MiniPill>
                  <span className="font-mono text-[9px]" style={{ color: '#00d4ff' }}>
                    {v.cve}
                  </span>
                  {v.hasMetasploit && <MiniPill color="#c084fc">MSF</MiniPill>}
                  {v.hasPOC && <MiniPill color="#ff3b5c">POC</MiniPill>}
                  <span className="ml-auto text-[8.5px] font-mono" style={{ color: '#252e42' }}>
                    {v.target}:{v.port}
                  </span>
                </div>
                <div
                  className="text-[10px] font-semibold mb-1.5 truncate"
                  style={{ color: '#8da0c0' }}
                >
                  {v.name}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono shrink-0" style={{ color: '#252e42' }}>
                    EPSS
                  </span>
                  <div className="flex-1">
                    <EpssBar value={v.epss} />
                  </div>
                  <span
                    className="text-[8px] font-mono shrink-0"
                    style={{ color: v.exploitability === 'EASY' ? '#ff3b5c' : '#ffaa00' }}
                  >
                    {v.exploitability}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div
                className="flex flex-col justify-center gap-1 px-2 shrink-0"
                style={{ borderLeft: '1px solid #1a2030' }}
              >
                <button
                  className="px-2 py-1 rounded text-[8px] font-bold font-mono uppercase"
                  style={{
                    background: 'rgba(255,59,92,0.12)',
                    border: '1px solid rgba(255,59,92,0.30)',
                    color: '#ff3b5c',
                  }}
                >
                  Launch
                </button>
                <button
                  className="px-2 py-1 rounded text-[8px] font-bold font-mono uppercase"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.20)',
                    color: '#00d4ff',
                  }}
                >
                  Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 8. MAIN EXPORT
// ============================================================================

const TABS = ['Vulnerabilities', 'CVE Search', 'Reports', 'Exploit Suggestions'] as const;

export function Vulns() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-red-400 border-red-400 bg-red-500/5"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0">
        <ToolbarButton variant="cyan">Auto-Exploit</ToolbarButton>
        <ToolbarButton>Generate Report</ToolbarButton>
        <div className="w-px h-4 bg-[#1e2535] mx-1" />
        <ToolbarButton>Import Nessus XML</ToolbarButton>
        <ToolbarButton>Import OpenVAS</ToolbarButton>
        <ToolbarButton className="ml-auto">Export CSV</ToolbarButton>
        <ToolbarButton>Export JSON</ToolbarButton>
      </div>

      {activeTab === 'Vulnerabilities' && <TabVulnerabilities vulns={mockVulns} />}
      {activeTab === 'CVE Search' && <TabCVESearch />}
      {activeTab === 'Reports' && <TabReports />}
      {activeTab === 'Exploit Suggestions' && <TabExploitSuggestions vulns={mockVulns} />}
    </div>
  );
}
