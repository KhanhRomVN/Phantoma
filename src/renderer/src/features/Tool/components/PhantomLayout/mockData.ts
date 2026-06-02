// ─── Mock Data for Phantom Layout ────────────────────────────────────────────

export const mockTargets = [
  { id: '1', label: '192.168.1.0/24', badge: 'LAN', badgeColor: 'green' as const, icon: 'network' },
  { id: '2', label: 'target.corp.local', badge: '7 vulns', badgeColor: 'red' as const, icon: 'globe' },
  { id: '3', label: '10.0.0.50', badge: 'scanning', badgeColor: 'amber' as const, icon: 'lock' },
  { id: '4', label: 'api.vuln-demo.io', badge: 'CRIT', badgeColor: 'red' as const, icon: 'server' },
];

export const mockWordlists = [
  { id: '1', label: 'rockyou.txt', badge: '14.3M', badgeColor: 'cyan' as const },
  { id: '2', label: 'dirbuster-med.txt', badge: '220K', badgeColor: 'cyan' as const },
  { id: '3', label: 'sqli-payloads.txt', badge: '4.8K', badgeColor: 'red' as const },
];

export const mockCredentials = [
  { id: '1', label: 'admin:admin123', badge: 'VALID', badgeColor: 'green' as const },
  { id: '2', label: 'root:toor', badge: 'INVALID', badgeColor: 'red' as const },
];

export const mockCVEs = [
  { id: '1', label: 'CVE-2024-44000', badge: '9.8', badgeColor: 'red' as const },
  { id: '2', label: 'CVE-2024-38812', badge: '7.2', badgeColor: 'amber' as const },
  { id: '3', label: 'CVE-2024-21413', badge: '9.8', badgeColor: 'purple' as const },
];

export const mockHosts = [
  {
    ip: '192.168.1.1',
    hostname: 'gateway.local',
    os: 'Router',
    ports: [
      { number: '22/ssh', status: 'open' as const },
      { number: '80/http', status: 'open' as const },
      { number: '443/https', status: 'open' as const },
      { number: '8080', status: 'filtered' as const },
    ],
  },
  {
    ip: '192.168.1.10',
    hostname: 'dc01.corp.local',
    os: 'Windows Server',
    ports: [
      { number: '88/kerberos', status: 'vuln' as const },
      { number: '135/msrpc', status: 'open' as const },
      { number: '389/ldap', status: 'open' as const },
      { number: '445/smb', status: 'vuln' as const },
      { number: '3389/rdp', status: 'open' as const },
    ],
  },
  {
    ip: '192.168.1.20',
    hostname: 'web01.corp.local',
    os: 'Linux/Ubuntu',
    ports: [
      { number: '22/ssh', status: 'open' as const },
      { number: '80/http', status: 'open' as const },
      { number: '3306/mysql', status: 'vuln' as const },
    ],
  },
  {
    ip: '192.168.1.30',
    hostname: '—',
    os: 'Unknown',
    ports: [
      { number: '21/ftp', status: 'open' as const },
      { number: '23/telnet', status: 'vuln' as const },
      { number: '8080', status: 'open' as const },
    ],
  },
];

export const mockScanLogs = [
  { ts: '09:14:32', tag: 'SCAN', tagColor: 'cyan', msg: 'Starting Nmap 7.95 scan on 192.168.1.0/24' },
  { ts: '09:14:33', tag: 'HOST', tagColor: 'green', msg: '192.168.1.1 — Up (0.00035s latency)' },
  { ts: '09:14:34', tag: 'PORT', tagColor: 'green', msg: '22/tcp open  ssh OpenSSH 8.9' },
  { ts: '09:14:34', tag: 'PORT', tagColor: 'green', msg: '80/tcp open  http Apache httpd 2.4.51' },
  { ts: '09:14:35', tag: 'WARN', tagColor: 'amber', msg: 'SMB signing disabled on 192.168.1.10' },
  { ts: '09:14:36', tag: 'VULN', tagColor: 'red', msg: '445/tcp open — EternalBlue (MS17-010) possible' },
  { ts: '09:14:36', tag: 'VULN', tagColor: 'red', msg: '3306/tcp open MySQL — anonymous auth allowed' },
  { ts: '09:14:37', tag: 'WARN', tagColor: 'amber', msg: 'Telnet (23) detected on 192.168.1.30 — plaintext protocol' },
  { ts: '09:14:38', tag: 'INFO', tagColor: 'cyan', msg: 'Scanning 192.168.1.40-60 …' },
  { ts: '09:14:39', tag: 'CRIT', tagColor: 'purple', msg: 'Log4Shell (CVE-2021-44228) indicator on 192.168.1.20:8080' },
  { ts: '09:14:40', tag: 'INFO', tagColor: 'cyan', msg: 'OS detection: 192.168.1.10 — Windows Server 2019 (TTL 128)' },
  { ts: '09:14:41', tag: 'DBG', tagColor: 'gray', msg: 'RTT variance: min=0.3ms avg=1.2ms max=14ms' },
];

export const mockVulns = [
  {
    id: '1',
    severity: 'CRITICAL' as const,
    name: 'Log4Shell — Remote Code Execution',
    cve: 'CVE-2021-44228',
    desc: 'Unauthenticated RCE via JNDI injection in Apache Log4j 2.x. Exploitable via any log-controlled user input. CVSS 10.0.',
    target: '192.168.1.20:8080',
    component: 'Apache Log4j 2.14.1',
    cvss: 10.0,
  },
  {
    id: '2',
    severity: 'CRITICAL' as const,
    name: 'EternalBlue — SMB RCE',
    cve: 'MS17-010',
    desc: 'SMBv1 vulnerability allowing unauthenticated remote code execution. Used in WannaCry ransomware. Still unpatched on DC01.',
    target: '192.168.1.10:445',
    component: 'Windows SMBv1',
    cvss: 9.8,
  },
  {
    id: '3',
    severity: 'HIGH' as const,
    name: 'SQL Injection — Login Bypass',
    cve: 'CWE-89',
    desc: 'Unsanitized user input in /api/v1/login parameter "username". Classic UNION-based SQLi confirmed. DB: MySQL 5.7.',
    target: 'target.corp.local/api/v1/login',
    component: 'MySQL 5.7',
    cvss: 8.1,
  },
  {
    id: '4',
    severity: 'HIGH' as const,
    name: 'Stored XSS — Admin Comment',
    cve: 'CWE-79',
    desc: 'Stored cross-site scripting in the blog comment field. JavaScript injected here executes in admin context.',
    target: 'target.corp.local/blog',
    component: 'WordPress 5.9.3',
    cvss: 7.5,
  },
  {
    id: '5',
    severity: 'MEDIUM' as const,
    name: 'Insecure Direct Object Reference',
    cve: 'CWE-639',
    desc: 'Sequential user IDs exposed at /api/v1/users/{id}. No authorization check.',
    target: 'api.target.corp.local',
    component: 'REST API',
    cvss: 5.4,
  },
  {
    id: '6',
    severity: 'MEDIUM' as const,
    name: 'Default Credentials — Jenkins',
    cve: 'CWE-521',
    desc: 'Jenkins instance accessible with default admin:admin credentials. Full pipeline access.',
    target: 'jenkins.target.corp.local',
    component: 'Jenkins 2.375',
    cvss: 6.2,
  },
];

export const mockIntruderResults = [
  { num: '0241', username: 'admin', password: 'admin123', status: 200, length: 1432, time: '142ms', hit: true },
  { num: '0388', username: 'administrator', password: 'P@ssw0rd!', status: 200, length: 1432, time: '138ms', hit: true },
  { num: '0001', username: 'admin', password: '123456', status: 401, length: 89, time: '44ms', hit: false },
  { num: '0002', username: 'admin', password: 'password', status: 401, length: 89, time: '41ms', hit: false },
  { num: '0003', username: 'admin', password: 'letmein', status: 401, length: 89, time: '43ms', hit: false },
  { num: '0004', username: 'admin', password: 'qwerty', status: 401, length: 89, time: '40ms', hit: false },
  { num: '0100', username: 'root', password: 'toor', status: 401, length: 89, time: '42ms', hit: false },
  { num: '0101', username: 'root', password: 'root', status: 401, length: 89, time: '41ms', hit: false },
  { num: '0200', username: 'user', password: 'user', status: 403, length: 61, time: '38ms', hit: false },
];

export const mockSubdomains = [
  { sub: 'admin.target.corp.local', status: 200, risk: 'high' as const },
  { sub: 'api.target.corp.local', status: 200, risk: 'normal' as const },
  { sub: 'jenkins.target.corp.local', status: 200, risk: 'high' as const },
  { sub: 'vpn.target.corp.local', status: 200, risk: 'high' as const },
  { sub: 'dev.target.corp.local', status: 403, risk: 'normal' as const },
  { sub: 'mail.target.corp.local', status: 301, risk: 'normal' as const },
  { sub: 'git.target.corp.local', status: 200, risk: 'high' as const },
  { sub: 'staging.target.corp.local', status: 404, risk: 'none' as const },
];

export const mockScanProgress = [
  { label: 'Recon', pct: 100, color: 'green' as const },
  { label: 'Port Scan', pct: 100, color: 'green' as const },
  { label: 'Vuln Scan', pct: 78, color: 'cyan' as const },
  { label: 'SQLi/XSS Fuzz', pct: 34, color: 'amber' as const },
  { label: 'Brute Force', pct: 0, color: 'gray' as const },
];
