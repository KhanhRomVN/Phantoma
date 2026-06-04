// src/renderer/src/features/Tool/components/WorkspaceSection/Vulns/index.tsx
import { useState } from 'react';
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
// 1. MOCK DATA CHI TIẾT
// ============================================================================

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Vulnerability {
  id: string;
  name: string;
  cve: string;
  severity: SeverityLevel;
  cvss: number;
  description: string;
  target: string;
  component: string;
  impact: string;
  remediation: string;
  references?: string[];
  exploitability: 'EASY' | 'MODERATE' | 'HARD';
  published: string;
  inTheWild: boolean;
  epss: number; // Exploit Prediction Scoring System
  vector: string; // CVSS vector
}

// Mock vulnerabilities – đa dạng, thực tế
const mockVulns: Vulnerability[] = [
  {
    id: '1',
    name: 'Log4Shell — Remote Code Execution',
    cve: 'CVE-2021-44228',
    severity: 'CRITICAL',
    cvss: 10.0,
    description:
      'Unauthenticated RCE via JNDI injection in Apache Log4j 2.x. Exploitable via any log-controlled user input. Widespread impact.',
    target: '192.168.1.20:8080',
    component: 'Apache Log4j 2.14.1',
    impact: 'Complete system compromise, data exfiltration, ransomware deployment',
    remediation:
      'Upgrade Log4j to version 2.17.0 or later, remove JNDI lookup class, set LOG4J_FORMAT_MSG_NO_LOOKUPS=true',
    references: [
      'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
      'https://www.lunasec.io/docs/blog/log4j-zero-day/',
    ],
    exploitability: 'EASY',
    published: '2021-12-10',
    inTheWild: true,
    epss: 0.974,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
  },
  {
    id: '2',
    name: 'EternalBlue — SMB Remote Code Execution',
    cve: 'MS17-010',
    severity: 'CRITICAL',
    cvss: 9.8,
    description:
      'SMBv1 vulnerability allowing unauthenticated remote code execution. Used in WannaCry and NotPetya ransomware campaigns.',
    target: '192.168.1.10:445',
    component: 'Windows SMBv1 (srv.sys)',
    impact: 'Remote code execution as SYSTEM, wormable across networks',
    remediation: 'Install security update KB4013389, disable SMBv1 via Group Policy or PowerShell',
    references: [
      'https://msrc.microsoft.com/update-guide/vulnerability/MS17-010',
      'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    ],
    exploitability: 'EASY',
    published: '2017-03-14',
    inTheWild: true,
    epss: 0.987,
    vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  },
  {
    id: '3',
    name: 'SQL Injection — Login Bypass',
    cve: 'CWE-89',
    severity: 'HIGH',
    cvss: 8.1,
    description:
      'Unsanitized user input in /api/v1/login parameter "username". Classic UNION-based SQLi confirmed. DB: MySQL 5.7.',
    target: 'target.corp.local/api/v1/login',
    component: 'PHP 7.4.33 + MySQL 5.7',
    impact: 'Authentication bypass, sensitive data disclosure (user credentials, PII)',
    remediation:
      'Use parameterized queries/prepared statements, implement input validation, apply least privilege DB user',
    references: [
      'https://owasp.org/www-community/attacks/SQL_Injection',
      'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
    ],
    exploitability: 'EASY',
    published: '2024-02-01',
    inTheWild: true,
    epss: 0.82,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
  },
  {
    id: '4',
    name: 'Stored XSS — Admin Comment',
    cve: 'CWE-79',
    severity: 'HIGH',
    cvss: 7.5,
    description:
      'Stored cross-site scripting in the blog comment field. JavaScript injected here executes in admin context. No CSP.',
    target: 'target.corp.local/blog',
    component: 'WordPress 5.9.3',
    impact: 'Session hijacking, credential theft, defacement, malware distribution',
    remediation:
      'Encode output, implement CSP, use HTML sanitizers (HTMLPurifier), upgrade WordPress',
    exploitability: 'MODERATE',
    published: '2024-03-10',
    inTheWild: true,
    epss: 0.65,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N',
  },
  {
    id: '5',
    name: 'Insecure Direct Object Reference (IDOR)',
    cve: 'CWE-639',
    severity: 'MEDIUM',
    cvss: 5.4,
    description:
      'Sequential user IDs exposed at /api/v1/users/{id}. No authorization check. Authenticated users can view any profile.',
    target: 'api.target.corp.local',
    component: 'REST API (Node.js + Express)',
    impact: "Information disclosure (other users' personal data, email, role)",
    remediation:
      'Implement proper access control checks (user → resource ownership), use UUIDs instead of sequential IDs',
    exploitability: 'EASY',
    published: '2024-04-22',
    inTheWild: false,
    epss: 0.42,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N',
  },
  {
    id: '6',
    name: 'Default Credentials — Jenkins',
    cve: 'CWE-521',
    severity: 'MEDIUM',
    cvss: 6.2,
    description:
      'Jenkins instance accessible with default admin:admin credentials. Full pipeline access, build configuration, code deployment.',
    target: 'jenkins.target.corp.local',
    component: 'Jenkins 2.375',
    impact: 'Unauthorized access to CI/CD pipeline, source code exposure, supply chain compromise',
    remediation:
      'Change default credentials, enforce strong password policy, enable MFA, restrict network access',
    exploitability: 'EASY',
    published: '2024-01-05',
    inTheWild: true,
    epss: 0.71,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
  },
  {
    id: '7',
    name: 'OpenSSH Pre-Auth Remote Code Execution',
    cve: 'CVE-2023-38408',
    severity: 'CRITICAL',
    cvss: 9.8,
    description:
      'OpenSSH 8.9p1 Ubuntu 3ubuntu0.4 vulnerable to RCE via forwarded agent socket. Unauthenticated attacker can execute arbitrary code.',
    target: '192.168.1.20:22',
    component: 'OpenSSH 8.9p1',
    impact: 'Full remote code execution, privilege escalation to root',
    remediation:
      'Upgrade openssh-server to version 8.9p1-3ubuntu0.5 or later, disable ssh-agent forwarding',
    exploitability: 'MODERATE',
    published: '2023-07-19',
    inTheWild: true,
    epss: 0.93,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  },
  {
    id: '8',
    name: 'MySQL Anonymous Authentication',
    cve: 'CWE-284',
    severity: 'MEDIUM',
    cvss: 5.8,
    description:
      'MySQL 8.0.33 allows anonymous login with empty password. Attacker can query database without credentials.',
    target: '192.168.1.20:3306',
    component: 'MySQL 8.0.33',
    impact: 'Unauthorized data access, information disclosure',
    remediation: "Remove anonymous users: DELETE FROM mysql.user WHERE User=''; FLUSH PRIVILEGES;",
    exploitability: 'EASY',
    published: '2024-02-10',
    inTheWild: false,
    epss: 0.38,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
  },
  {
    id: '9',
    name: 'BusyBox Telnetd RCE',
    cve: 'CVE-2022-30065',
    severity: 'HIGH',
    cvss: 8.9,
    description:
      'BusyBox telnetd 1.33.2 vulnerable to RCE via specially crafted packet. Device running telnetd exposed to LAN.',
    target: '192.168.1.30:23',
    component: 'BusyBox telnetd 1.33.2',
    impact: 'Remote code execution as root on embedded device',
    remediation: 'Disable telnet service, use SSH instead, upgrade busybox to >= 1.34.0',
    exploitability: 'MODERATE',
    published: '2022-06-21',
    inTheWild: true,
    epss: 0.77,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  },
  {
    id: '10',
    name: 'Jenkins Authentication Bypass',
    cve: 'CVE-2023-27898',
    severity: 'CRITICAL',
    cvss: 9.1,
    description:
      'Jenkins 2.401.1 allows unauthenticated attackers to read arbitrary files and execute code via crafted HTTP requests.',
    target: '192.168.1.20:8080',
    component: 'Jenkins 2.401.1',
    impact: 'Information disclosure, remote code execution, build pipeline compromise',
    remediation: 'Upgrade Jenkins to version 2.401.2 or 2.414.1 LTS',
    exploitability: 'EASY',
    published: '2023-06-21',
    inTheWild: true,
    epss: 0.96,
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
  },
];

// CVE Search mock results
const cveSearchResults = [
  {
    cve: 'CVE-2024-38812',
    description: 'Apache Tomcat request smuggling',
    published: '2024-05-15',
    cvss: 7.5,
    severity: 'HIGH' as SeverityLevel,
    affectedProduct: 'Tomcat 9.0.80',
  },
  {
    cve: 'CVE-2024-21413',
    description: 'Microsoft Outlook RCE via email preview',
    published: '2024-02-13',
    cvss: 9.8,
    severity: 'CRITICAL' as SeverityLevel,
    affectedProduct: 'Outlook 2016',
  },
  {
    cve: 'CVE-2024-3400',
    description: 'Palo Alto GlobalProtect command injection',
    published: '2024-04-12',
    cvss: 10.0,
    severity: 'CRITICAL' as SeverityLevel,
    affectedProduct: 'PAN-OS 11.0',
  },
];

// Reports mock data
const reports = [
  {
    id: 'RPT-001',
    name: 'Executive Summary - CyberCorp',
    date: '2025-05-20',
    findings: 27,
    critical: 3,
    high: 7,
    medium: 12,
    low: 5,
  },
  {
    id: 'RPT-002',
    name: 'Technical Appendix - Full Scan Results',
    date: '2025-05-15',
    findings: 142,
    critical: 8,
    high: 23,
    medium: 45,
    low: 66,
  },
  {
    id: 'RPT-003',
    name: 'Remediation Roadmap',
    date: '2025-05-10',
    findings: 27,
    critical: 3,
    high: 7,
    medium: 12,
    low: 5,
  },
];

// ============================================================================
// 2. UI COMPONENTS
// ============================================================================

const CIRCUMFERENCE = 163.4;

const CVSS_COLOR = (score: number) => {
  if (score >= 9) return 'text-purple-400';
  if (score >= 7) return 'text-red-400';
  if (score >= 4) return 'text-amber-400';
  return 'text-cyan-400';
};

const CVSS_STROKE = (score: number) => {
  if (score >= 9) return '#a855f7';
  if (score >= 7) return '#ff3b5c';
  if (score >= 4) return '#ffaa00';
  return '#00d4ff';
};

function CvssRing({ score, severity }: { score: number; severity: SeverityLevel }) {
  const offset = CIRCUMFERENCE - (score / 10) * CIRCUMFERENCE;
  return (
    <div className="flex flex-col items-center mb-4">
      <div className="relative w-16 h-16 flex items-center justify-center mb-1">
        <svg className="absolute inset-0" width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#252e42" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke={CVSS_STROKE(score)}
            strokeWidth="5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className={cn('text-xl font-bold', CVSS_COLOR(score))}>{score}</span>
      </div>
      <div className="text-[9.5px] text-[#6b7a96]">CVSS 3.1 — {severity}</div>
    </div>
  );
}

function VulnCard({
  vuln,
  selected,
  onClick,
}: {
  vuln: Vulnerability;
  selected?: boolean;
  onClick?: () => void;
}) {
  const barColor =
    vuln.cvss >= 9
      ? 'bg-purple-400'
      : vuln.cvss >= 7
        ? 'bg-red-400'
        : vuln.cvss >= 4
          ? 'bg-amber-400'
          : 'bg-cyan-400';
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#111520] border rounded-md p-2.5 mb-2 cursor-pointer transition-all',
        selected ? 'border-cyan-500/30 bg-cyan-500/4' : 'border-[#1e2535] hover:border-[#252e42]',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <SeverityPill level={vuln.severity} />
        <span className="text-[12px] font-semibold text-[#c5cfe0] flex-1 min-w-0 truncate">
          {vuln.name}
        </span>
        <span className="text-[10px] text-[#6b7a96] shrink-0 font-mono">{vuln.cve}</span>
      </div>
      <p className="text-[10.5px] text-[#6b7a96] leading-relaxed mb-1.5 line-clamp-2">
        {vuln.description}
      </p>
      <div className="flex items-center gap-2 text-[10px] text-[#3d4a61]">
        <span className="truncate">{vuln.target}</span>
        <span>·</span>
        <span className="truncate">{vuln.component}</span>
        <div
          className="flex-1 h-[3px] bg-[#252e42] rounded overflow-hidden ml-2 shrink-0"
          style={{ minWidth: 40 }}
        >
          <div
            className={cn('h-full rounded', barColor)}
            style={{ width: `${(vuln.cvss / 10) * 100}%` }}
          />
        </div>
        <span className={cn('font-bold shrink-0', CVSS_COLOR(vuln.cvss))}>{vuln.cvss}</span>
      </div>
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
);

function VulnDetails({ vuln }: { vuln: Vulnerability }) {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden w-[35%]">
      <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">
          Details
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <CvssRing score={vuln.cvss} severity={vuln.severity} />

        <div className="mb-3">
          <SectionTitle>Identifiers</SectionTitle>
          <KVRow label="CVE ID" value={vuln.cve} valueColor="text-cyan-400" />
          <KVRow label="CVSS Vector" value={vuln.vector} valueColor="text-[#6b7a96]" />
          <KVRow label="EPSS" value={`${(vuln.epss * 100).toFixed(1)}% (exploit probability)`} />
          <KVRow label="Published" value={vuln.published} />
          <KVRow
            label="In the wild"
            value={vuln.inTheWild ? 'YES — Active exploitation' : 'No known active exploitation'}
            valueColor={vuln.inTheWild ? 'text-red-400' : 'text-green-400'}
          />
          <KVRow
            label="Exploitability"
            value={vuln.exploitability}
            valueColor={vuln.exploitability === 'EASY' ? 'text-red-400' : 'text-amber-400'}
          />
        </div>

        <div className="mb-3">
          <SectionTitle>Affected Assets</SectionTitle>
          <KVRow label="Target" value={vuln.target} />
          <KVRow label="Component" value={vuln.component} />
        </div>

        <div className="mb-3">
          <SectionTitle>Impact</SectionTitle>
          <div className="text-[10.5px] text-[#c5cfe0] mb-2">{vuln.impact}</div>
        </div>

        <div className="mb-3">
          <SectionTitle>Remediation</SectionTitle>
          <div className="text-[10.5px] text-green-400 mb-2">{vuln.remediation}</div>
        </div>

        <div className="mb-3">
          <SectionTitle>References</SectionTitle>
          {(vuln.references ?? []).map((ref, i) => (
            <div key={i} className="text-[10px] text-cyan-400 mb-1 truncate">
              {ref}
            </div>
          ))}
        </div>

        <div>
          <SectionTitle>Actions</SectionTitle>
          <ActionButton variant="red">
            <span className="opacity-40 text-xs mr-1">›</span> Launch Exploit Module
          </ActionButton>
          <ActionButton variant="cyan">
            <span className="opacity-40 text-xs mr-1">›</span> Open in Metasploit
          </ActionButton>
          <ActionButton variant="purple">
            <span className="opacity-40 text-xs mr-1">›</span> Send to Post-Exploit
          </ActionButton>
          <ActionButton>
            <span className="opacity-40 text-xs mr-1">›</span> Add to Report
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

function TabVulnerabilities({
  vulns,
  selectedId,
  onSelect,
}: {
  vulns: Vulnerability[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [severityFilter, setSeverityFilter] = useState<Record<SeverityLevel, boolean>>({
    CRITICAL: true,
    HIGH: true,
    MEDIUM: true,
    LOW: true,
  });

  const toggleFilter = (sev: SeverityLevel) => {
    setSeverityFilter((prev) => ({ ...prev, [sev]: !prev[sev] }));
  };

  const filteredVulns = vulns.filter((v) => severityFilter[v.severity]);

  return (
    <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
      <div className="flex flex-col bg-[#141924] overflow-hidden w-[65%]">
        <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">
            Vulnerabilities
          </span>
          <Badge color="red">{filteredVulns.length} total</Badge>
        </div>
        <div className="flex gap-1 px-3 py-1.5 bg-[#0f1319] border-b border-[#1e2535] shrink-0">
          <button
            onClick={() => toggleFilter('CRITICAL')}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all',
              severityFilter.CRITICAL
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-400'
                : 'border-[#252e42] bg-transparent text-[#6b7a96]',
            )}
          >
            CRITICAL (3)
          </button>
          <button
            onClick={() => toggleFilter('HIGH')}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all',
              severityFilter.HIGH
                ? 'border-red-500/40 bg-red-500/12 text-red-400'
                : 'border-[#252e42] bg-transparent text-[#6b7a96]',
            )}
          >
            HIGH (7)
          </button>
          <button
            onClick={() => toggleFilter('MEDIUM')}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all',
              severityFilter.MEDIUM
                ? 'border-amber-500/40 bg-amber-500/12 text-amber-400'
                : 'border-[#252e42] bg-transparent text-[#6b7a96]',
            )}
          >
            MEDIUM (12)
          </button>
          <button
            onClick={() => toggleFilter('LOW')}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all',
              severityFilter.LOW
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                : 'border-[#252e42] bg-transparent text-[#6b7a96]',
            )}
          >
            LOW (5)
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredVulns.map((v) => (
            <VulnCard
              key={v.id}
              vuln={v}
              selected={v.id === selectedId}
              onClick={() => onSelect(v.id)}
            />
          ))}
        </div>
      </div>
      <VulnDetails vuln={vulns.find((v) => v.id === selectedId) ?? vulns[0]} />
    </div>
  );
}

function TabCVESearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredResults = cveSearchResults.filter(
    (r) =>
      r.cve.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          placeholder="Search CVE ID or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 h-8 bg-[#111520] border border-[#252e42] rounded text-[11px] px-3 text-[#c5cfe0] focus:border-cyan-500/50 outline-none"
        />
        <ToolbarButton variant="cyan">Search NVD</ToolbarButton>
      </div>
      <div className="space-y-2">
        {filteredResults.map((cve, i) => (
          <div key={i} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-cyan-400 text-[12px] font-bold">{cve.cve}</span>
              <SeverityPill level={cve.severity} />
            </div>
            <div className="text-[11px] text-[#c5cfe0] mb-1">{cve.description}</div>
            <div className="flex gap-3 text-[10px] text-[#6b7a96]">
              <span>Published: {cve.published}</span>
              <span>CVSS: {cve.cvss}</span>
              <span>Product: {cve.affectedProduct}</span>
            </div>
            <div className="mt-2">
              <ActionButton variant="cyan" size="sm">
                Fetch Exploit
              </ActionButton>
              <ActionButton size="sm" className="ml-2">
                Add to Workspace
              </ActionButton>
            </div>
          </div>
        ))}
        {filteredResults.length === 0 && (
          <div className="text-center text-[#6b7a96] py-8">No CVEs found</div>
        )}
      </div>
    </div>
  );
}

function TabReports() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        {reports.map((report) => (
          <div key={report.id} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[12px] font-semibold text-cyan-400">{report.name}</span>
              <Badge color="gray">{report.date}</Badge>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-3">
              <div className="text-center">
                <div className="text-red-400 font-bold">{report.critical}</div>
                <div className="text-[9px] text-[#6b7a96]">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold">{report.high}</div>
                <div className="text-[9px] text-[#6b7a96]">High</div>
              </div>
              <div className="text-center">
                <div className="text-amber-400 font-bold">{report.medium}</div>
                <div className="text-[9px] text-[#6b7a96]">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-bold">{report.low}</div>
                <div className="text-[9px] text-[#6b7a96]">Low</div>
              </div>
            </div>
            <div className="flex gap-2">
              <ActionButton size="sm" variant="cyan">
                View
              </ActionButton>
              <ActionButton size="sm">Export PDF</ActionButton>
              <ActionButton size="sm">Export DOCX</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabExploitSuggestions() {
  const exploitSuggestions = mockVulns
    .filter((v) => v.exploitability === 'EASY' && v.inTheWild)
    .map((v) => ({ ...v, hasMetasploit: ['CVE-2021-44228', 'MS17-010'].includes(v.cve) }));

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="mb-2 text-[10px] text-[#3d4a61]">
        Prioritized exploit suggestions based on EPSS, in-the-wild status, and exploitability.
      </div>
      {exploitSuggestions.map((v, i) => (
        <div key={i} className="bg-[#111520] border border-[#1e2535] rounded p-3 mb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <SeverityPill level={v.severity} />
              <span className="font-mono text-cyan-400 text-[11px]">{v.cve}</span>
              {v.hasMetasploit && <Badge color="green">Metasploit</Badge>}
            </div>
            <div className="flex gap-1">
              <ActionButton size="sm" variant="red">
                Launch
              </ActionButton>
            </div>
          </div>
          <div className="text-[11px] text-[#c5cfe0] mt-1">{v.name}</div>
          <div className="flex gap-3 mt-1 text-[9px] text-[#6b7a96]">
            <span>EPSS: {(v.epss * 100).toFixed(1)}%</span>
            <span>In wild: {v.inTheWild ? 'Yes' : 'No'}</span>
            <span>Target: {v.target}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = ['Vulnerabilities', 'CVE Search', 'Reports', 'Exploit Suggestions'] as const;

export function Vulns() {
  const [selectedId, setSelectedId] = useState(mockVulns[0].id);
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Vulnerabilities':
        return (
          <TabVulnerabilities vulns={mockVulns} selectedId={selectedId} onSelect={setSelectedId} />
        );
      case 'CVE Search':
        return <TabCVESearch />;
      case 'Reports':
        return <TabReports />;
      case 'Exploit Suggestions':
        return <TabExploitSuggestions />;
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
        activeColor="text-red-400 border-red-400 bg-red-500/5"
      />
      <div className="shrink-0">
        <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] overflow-x-auto">
          <ToolbarButton variant="cyan">Auto-Exploit</ToolbarButton>
          <ToolbarButton>Generate Report</ToolbarButton>
          <ToolbarButton className="ml-auto">Export CSV</ToolbarButton>
        </div>
      </div>
      {renderTabContent()}
    </div>
  );
}
