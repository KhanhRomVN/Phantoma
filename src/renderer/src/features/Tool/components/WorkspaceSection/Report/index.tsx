// src/renderer/src/features/Tool/components/WorkspaceSection/Report/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  KVRow,
  ModuleTabBar,
  ToolbarButton,
  ProgressBar,
  ActionButton,
  SeverityPill,
} from '../../../../../core/components/ui';

// ============================================================================
// 1. MOCK DATA (CHI TIẾT CHO REPORT BUILDER)
// ============================================================================

interface ReportSection {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  description: string;
}

const reportSections: ReportSection[] = [
  {
    id: '1',
    label: 'Executive Summary',
    enabled: true,
    order: 1,
    description: 'High-level overview of engagement, key findings, and risk posture.',
  },
  {
    id: '2',
    label: 'Scope & Methodology',
    enabled: true,
    order: 2,
    description: 'Defined scope, tools used, and testing approach.',
  },
  {
    id: '3',
    label: 'Risk Summary',
    enabled: true,
    order: 3,
    description: 'Aggregated risk scores, CVSS distribution, and trending.',
  },
  {
    id: '4',
    label: 'Technical Findings',
    enabled: true,
    order: 4,
    description: 'Detailed vulnerability descriptions, proof-of-concept, and remediation.',
  },
  {
    id: '5',
    label: 'Evidence & Screenshots',
    enabled: true,
    order: 5,
    description: 'Supporting images, logs, and command outputs.',
  },
  {
    id: '6',
    label: 'Remediation Steps',
    enabled: true,
    order: 6,
    description: 'Actionable fix recommendations per finding.',
  },
  {
    id: '7',
    label: 'Appendix – IOCs',
    enabled: false,
    order: 7,
    description: 'Indicators of compromise from post-exploitation.',
  },
  {
    id: '8',
    label: 'Appendix – Raw Data',
    enabled: false,
    order: 8,
    description: 'Full scan logs, hash dumps, and packet captures.',
  },
];

// Report templates
const reportTemplates = [
  {
    id: 'standard',
    name: 'Pentest Standard',
    description: 'Comprehensive report for internal and external penetration tests.',
    sections: 8,
    popularity: 'high',
  },
  {
    id: 'exec',
    name: 'Executive Summary',
    description: 'Short, high-level for C‑level management.',
    sections: 4,
    popularity: 'high',
  },
  {
    id: 'bugbounty',
    name: 'Bug Bounty',
    description: 'Focused on vulnerability disclosure and reward recommendations.',
    sections: 5,
    popularity: 'medium',
  },
  {
    id: 'compliance',
    name: 'Compliance (PCI/HIPAA)',
    description: 'Includes compliance mapping and control evidence.',
    sections: 7,
    popularity: 'medium',
  },
];

// Data sources (findings, loot, logs, etc.)
const dataSources = {
  vulnerabilities: [
    {
      id: 'v1',
      name: 'Log4Shell RCE',
      severity: 'CRITICAL',
      cvss: 10.0,
      target: '192.168.1.20:8080',
      selected: true,
    },
    {
      id: 'v2',
      name: 'EternalBlue SMB',
      severity: 'CRITICAL',
      cvss: 9.8,
      target: '192.168.1.10:445',
      selected: true,
    },
    {
      id: 'v3',
      name: 'SQL Injection',
      severity: 'HIGH',
      cvss: 8.1,
      target: 'target.corp.local/api/login',
      selected: true,
    },
    {
      id: 'v4',
      name: 'Stored XSS',
      severity: 'HIGH',
      cvss: 7.5,
      target: 'target.corp.local/blog',
      selected: false,
    },
    {
      id: 'v5',
      name: 'IDOR',
      severity: 'MEDIUM',
      cvss: 5.4,
      target: 'api.target.corp.local/users',
      selected: false,
    },
  ],
  loot: [
    {
      id: 'l1',
      type: 'Hashdump',
      description: 'Administrator NTLM hash (cracked: P@ssw0rd!)',
      selected: true,
    },
    {
      id: 'l2',
      type: 'Phishing Creds',
      description: '11 harvested credentials from Corp IT Alert campaign',
      selected: true,
    },
    {
      id: 'l3',
      type: 'Golden Ticket',
      description: 'krbtgt hash extracted from DC01',
      selected: false,
    },
  ],
  networkLogs: [
    { id: 'n1', name: 'Nmap scan (full)', size: '1.2 MB', selected: false },
    { id: 'n2', name: 'PCAP – C2 traffic', size: '8.4 MB', selected: true },
    { id: 'n3', name: 'Burp Intruder results', size: '2.1 MB', selected: false },
  ],
};

// Charts data (for Risk Summary tab)
const chartData = {
  severityDistribution: { critical: 3, high: 7, medium: 12, low: 5 },
  topVulnerabilities: [
    { name: 'Log4Shell', cvss: 10.0, count: 1 },
    { name: 'EternalBlue', cvss: 9.8, count: 1 },
    { name: 'SQL Injection', cvss: 8.1, count: 4 },
    { name: 'XSS', cvss: 7.5, count: 6 },
  ],
  remediationStatus: { remediated: 2, pending: 25, accepted: 0 },
};

// Compliance mapping (PCI, HIPAA, ISO)
const complianceMapping = [
  {
    finding: 'Log4Shell RCE',
    pci: '6.5.10',
    hipaa: '164.312(b)',
    iso: 'A.12.6.1',
    severity: 'CRITICAL',
  },
  {
    finding: 'SMBv1 Enabled',
    pci: '2.2.4',
    hipaa: '164.312(a)(2)(i)',
    iso: 'A.14.2.1',
    severity: 'HIGH',
  },
  {
    finding: 'Weak Password Policy',
    pci: '8.2.3',
    hipaa: '164.312(a)(1)',
    iso: 'A.9.4.3',
    severity: 'MEDIUM',
  },
];

// Export formats
const exportFormats = [
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Professional, print-ready document',
    icon: '📄',
    enabled: true,
  },
  {
    id: 'docx',
    name: 'DOCX',
    description: 'Editable Microsoft Word format',
    icon: '📝',
    enabled: true,
  },
  { id: 'html', name: 'HTML', description: 'Web view, easy sharing', icon: '🌐', enabled: true },
  {
    id: 'json',
    name: 'JSON',
    description: 'Machine-readable data export',
    icon: '🔧',
    enabled: true,
  },
];

// Auto‑fill modal sources
const autofillSources = [
  { name: 'Vulnerability Scanner', count: 27, selected: true },
  { name: 'Post-Exploitation Loot', count: 14, selected: true },
  { name: 'Phishing Campaign', count: 11, selected: true },
  { name: 'Cloud Audit', count: 14, selected: false },
  { name: 'Sniffer Alerts', count: 2, selected: false },
];

// ============================================================================
// 2. UI COMPONENTS
// ============================================================================

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
);
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />;
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">
    {children}
  </div>
);

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'w-7 h-3.5 rounded-full relative cursor-pointer transition-colors shrink-0',
        enabled ? 'bg-green-500' : 'bg-[#252e42]',
      )}
    >
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all',
          enabled ? 'left-4' : 'left-0.5',
        )}
      />
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

function TabSections() {
  const [sections, setSections] = useState(reportSections);
  const toggle = (id: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  const moveUp = (idx: number) => {
    if (idx > 0) {
      const newSections = [...sections];
      [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
      setSections(newSections);
    }
  };
  const moveDown = (idx: number) => {
    if (idx < sections.length - 1) {
      const newSections = [...sections];
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
      setSections(newSections);
    }
  };
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        {sections.map((sec, idx) => (
          <div
            key={sec.id}
            className="flex items-center gap-3 p-2 border-b border-[#1e2535] last:border-0 hover:bg-[#0f1319]"
          >
            <div className="flex flex-col">
              <button
                onClick={() => moveUp(idx)}
                className="text-[#3d4a61] hover:text-cyan-400 text-xs"
              >
                ▲
              </button>
              <button
                onClick={() => moveDown(idx)}
                className="text-[#3d4a61] hover:text-cyan-400 text-xs"
              >
                ▼
              </button>
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-cyan-400">{sec.label}</div>
              <div className="text-[9px] text-[#6b7a96]">{sec.description}</div>
            </div>
            <ToggleSwitch enabled={sec.enabled} onToggle={() => toggle(sec.id)} />
          </div>
        ))}
      </div>
      <div className="mt-3 p-3 bg-[#111520] border border-[#1e2535] rounded">
        <SectionTitle>Branding & Metadata</SectionTitle>
        <KVRow
          label="Client Name"
          value={
            <input
              className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 text-[10px] w-40"
              defaultValue="Corp, Inc."
            />
          }
        />
        <KVRow
          label="Author"
          value={
            <input
              className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 text-[10px] w-40"
              defaultValue="Red Team Alpha"
            />
          }
        />
        <KVRow
          label="Classification"
          value={
            <select className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 text-[10px]">
              <option>CONFIDENTIAL</option>
              <option>INTERNAL</option>
              <option>PUBLIC</option>
            </select>
          }
        />
        <KVRow
          label="Logo"
          value={
            <button className="text-[9px] bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5">
              Upload
            </button>
          }
        />
      </div>
    </div>
  );
}

function TabPreview() {
  const enabledSections = reportSections.filter((s) => s.enabled);
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#080a0e]">
      <div className="max-w-3xl mx-auto bg-[#111520] border border-[#1e2535] rounded-lg p-6 shadow-lg">
        {/* Header */}
        <div className="border-b-2 border-red-500 pb-4 mb-5">
          <div className="text-[22px] font-bold text-[#c5cfe0] tracking-wide uppercase">
            PENETRATION TEST REPORT
          </div>
          <div className="text-[11px] text-[#6b7a96] mt-1">
            Corp, Inc. — Internal Infrastructure Assessment
          </div>
          <div className="text-[10px] text-[#3d4a61] mt-0.5">
            Classification: CONFIDENTIAL | Date: 2026-06-04 | Author: Red Team Alpha
          </div>
        </div>
        {/* Dynamic sections */}
        {enabledSections.map((section) => (
          <div key={section.id} className="mb-5">
            <div className="text-[14px] font-bold text-red-400 mb-2 uppercase tracking-wide">
              {section.label}
            </div>
            <div className="text-[11px] text-[#6b7a96] leading-6">
              {section.id === '1' && (
                <p>
                  Red Team Alpha conducted an internal penetration test of Corp, Inc.
                  infrastructure.{' '}
                  <span className="text-red-400 font-semibold">
                    27 vulnerabilities were identified
                  </span>
                  , including 3 critical-severity issues enabling full network compromise. Domain
                  Administrator privileges were obtained.
                </p>
              )}
              {section.id === '2' && (
                <p>
                  Scope: 192.168.1.0/24 internal network. Methodology: OSINT, port scanning (Nmap),
                  vulnerability scanning (Nessus), manual exploitation (Metasploit),
                  post-exploitation (Mimikatz, hashdump).
                </p>
              )}
              {section.id === '3' && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { n: 3, label: 'Critical', color: 'text-purple-400' },
                    { n: 7, label: 'High', color: 'text-red-400' },
                    { n: 12, label: 'Medium', color: 'text-amber-400' },
                    { n: 5, label: 'Low', color: 'text-cyan-400' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-[#0f1319] rounded p-2 text-center border border-[#1e2535]"
                    >
                      <div className={cn('text-[18px] font-bold', s.color)}>{s.n}</div>
                      <div className="text-[9px] text-[#6b7a96]">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {section.id === '4' && (
                <div className="space-y-2">
                  <div className="bg-[#0f1319] border border-purple-500/20 rounded p-2">
                    <div className="flex justify-between">
                      <span className="text-[11px] font-bold text-purple-400">
                        Log4Shell (CVE-2021-44228)
                      </span>
                      <span className="text-[10px]">CVSS 10.0</span>
                    </div>
                    <div className="text-[10px] text-[#6b7a96]">
                      Unauthenticated RCE on 192.168.1.20:8080 → root shell.
                    </div>
                  </div>
                  <div className="bg-[#0f1319] border border-red-500/20 rounded p-2">
                    <div className="flex justify-between">
                      <span className="text-[11px] font-bold text-red-400">
                        EternalBlue (MS17-010)
                      </span>
                      <span className="text-[10px]">CVSS 9.8</span>
                    </div>
                    <div className="text-[10px] text-[#6b7a96]">
                      SMBv1 RCE on DC01 → SYSTEM shell, domain compromise.
                    </div>
                  </div>
                </div>
              )}
              {section.id === '5' && (
                <div className="bg-[#0f1319] rounded p-2 text-center text-[10px] text-[#6b7a96]">
                  [Screenshot placeholder] Nmap scan results, Mimikatz output, session listing.
                </div>
              )}
              {section.id === '6' && (
                <ul className="list-disc list-inside text-[10px] space-y-0.5">
                  <li>Upgrade Log4j to ≥2.17.0</li>
                  <li>Disable SMBv1 and apply MS17-010 patch</li>
                  <li>Implement input validation for SQLi endpoints</li>
                </ul>
              )}
              {!['1', '2', '3', '4', '5', '6'].includes(section.id) && (
                <p className="text-[#6b7a96] italic">
                  Placeholder content for {section.label}. Data will be auto-filled from findings.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabExport() {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [exporting, setExporting] = useState(false);
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 1500);
  };
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Export Format</SectionTitle>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {exportFormats.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={cn(
                  'p-2 rounded text-center cursor-pointer border',
                  selectedFormat === f.id
                    ? 'border-cyan-500/40 bg-cyan-500/10'
                    : 'border-[#252e42] hover:bg-[#0f1319]',
                )}
              >
                <div className="text-xl">{f.icon}</div>
                <div className="text-[11px] font-semibold text-cyan-400">{f.name}</div>
                <div className="text-[8px] text-[#6b7a96]">{f.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 items-center justify-between">
            <div className="text-[10px] text-[#6b7a96]">
              File will be generated with selected sections and branding.
            </div>
            <ToolbarButton variant="green" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : '▶ Export Report'}
            </ToolbarButton>
          </div>
          {exporting && <ProgressBar pct={100} color="green" className="mt-2" />}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Options</SectionTitle>
          <label className="flex items-center gap-2 text-[10px]">
            <input type="checkbox" defaultChecked /> Include appendices
          </label>
          <label className="flex items-center gap-2 text-[10px]">
            <input type="checkbox" defaultChecked /> Compress images
          </label>
          <label className="flex items-center gap-2 text-[10px]">
            <input type="checkbox" /> Password protect PDF
          </label>
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Recent Exports</SectionTitle>
          <div className="text-[10px] space-y-1">
            <div className="flex justify-between">
              <span>pentest_report_2025-06-01.pdf</span>
              <span className="text-[#3d4a61]">2.3 MB</span>
            </div>
            <div className="flex justify-between">
              <span>exec_summary_CORP.docx</span>
              <span className="text-[#3d4a61]">512 KB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabTemplates() {
  const [selected, setSelected] = useState('standard');
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        {reportTemplates.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={cn(
              'p-3 rounded border cursor-pointer transition-all',
              selected === t.id
                ? 'border-cyan-500/40 bg-cyan-500/10'
                : 'border-[#1e2535] bg-[#111520] hover:border-[#252e42]',
            )}
          >
            <div className="flex justify-between">
              <span className="text-[11px] font-semibold text-cyan-400">{t.name}</span>
              <Badge color="gray">{t.sections} sections</Badge>
            </div>
            <div className="text-[9px] text-[#6b7a96] mt-1">{t.description}</div>
            <div className="mt-2">
              <ActionButton size="sm" variant="cyan">
                Load
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabDataSources() {
  const [vulns, setVulns] = useState(dataSources.vulnerabilities);
  const [loot, setLoot] = useState(dataSources.loot);
  const toggleVuln = (id: string) =>
    setVulns((prev) => prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v)));
  const toggleLoot = (id: string) =>
    setLoot((prev) => prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l)));
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="space-y-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-2">
          <SectionTitle>
            Vulnerabilities ({vulns.filter((v) => v.selected).length} selected)
          </SectionTitle>
          {vulns.map((v) => (
            <label key={v.id} className="flex items-center gap-2 p-1 text-[10px] cursor-pointer">
              <input type="checkbox" checked={v.selected} onChange={() => toggleVuln(v.id)} />
              <SeverityPill level={v.severity as any} />
              <span className="flex-1">{v.name}</span>
              <span className="text-[#6b7a96]">{v.target}</span>
            </label>
          ))}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-2">
          <SectionTitle>
            Loot / Credentials ({loot.filter((l) => l.selected).length} selected)
          </SectionTitle>
          {loot.map((l) => (
            <label key={l.id} className="flex items-center gap-2 p-1 text-[10px] cursor-pointer">
              <input type="checkbox" checked={l.selected} onChange={() => toggleLoot(l.id)} />
              <span className="flex-1">{l.type}</span>
              <span className="text-[#6b7a96] text-[9px]">{l.description}</span>
            </label>
          ))}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-2">
          <SectionTitle>Network Logs (optional)</SectionTitle>
          {dataSources.networkLogs.map((n) => (
            <label key={n.id} className="flex items-center gap-2 p-1 text-[10px] cursor-pointer">
              <input type="checkbox" defaultChecked={n.selected} />
              <span>{n.name}</span>
              <span className="text-[#6b7a96]">{n.size}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabCharts() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Severity Distribution</SectionTitle>
          <div className="space-y-1">
            {Object.entries(chartData.severityDistribution).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-[10px]">
                  <span className="capitalize">{k}</span>
                  <span>{v}</span>
                </div>
                <ProgressBar
                  pct={(v / 27) * 100}
                  color={
                    k === 'critical'
                      ? 'purple'
                      : k === 'high'
                        ? 'red'
                        : k === 'medium'
                          ? 'amber'
                          : 'cyan'
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Top Vulnerabilities by CVSS</SectionTitle>
          {chartData.topVulnerabilities.map((v) => (
            <KVRow
              key={v.name}
              label={v.name}
              value={`CVSS ${v.cvss} (x${v.count})`}
              valueColor="text-amber-400"
            />
          ))}
        </div>
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Remediation Status</SectionTitle>
          <KVRow
            label="Remediated"
            value={`${chartData.remediationStatus.remediated}/27`}
            valueColor="text-green-400"
          />
          <KVRow
            label="Pending"
            value={`${chartData.remediationStatus.pending}/27`}
            valueColor="text-red-400"
          />
          <ProgressBar pct={(chartData.remediationStatus.remediated / 27) * 100} color="green" />
        </div>
      </div>
    </div>
  );
}

function TabCompliance() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        <table className="w-full text-[10px]">
          <thead className="border-b border-[#1e2535] bg-[#0f1319]">
            <tr>
              <th className="p-2">Finding</th>
              <th className="p-2">PCI DSS</th>
              <th className="p-2">HIPAA</th>
              <th className="p-2">ISO 27001</th>
              <th className="p-2">Severity</th>
            </tr>
          </thead>
          <tbody>
            {complianceMapping.map((c) => (
              <tr key={c.finding} className="border-b border-[#1e2535]">
                <td className="p-2">{c.finding}</td>
                <td className="p-2 text-cyan-400">{c.pci}</td>
                <td className="p-2 text-cyan-400">{c.hipaa}</td>
                <td className="p-2 text-cyan-400">{c.iso}</td>
                <td className="p-2">
                  <SeverityPill level={c.severity as any} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Auto‑fill modal (FIX #13)
function AutoFillModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#111520] border border-[#252e42] rounded-lg p-4 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[11px] font-bold text-[#c5cfe0] mb-2">Auto-Fill Sources</div>
        <div className="text-[10px] text-[#6b7a96] mb-2">Select which findings to include:</div>
        {autofillSources.map((s) => (
          <label key={s.name} className="flex items-center gap-2 text-[10px] py-1">
            <input type="checkbox" defaultChecked={s.selected} />
            <span className="flex-1">{s.name}</span>
            <span className="text-[#3d4a61]">{s.count}</span>
          </label>
        ))}
        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 bg-cyan-500/10 border border-cyan-500/30 rounded py-1 text-cyan-400 text-[10px]"
            onClick={onClose}
          >
            ✓ Apply
          </button>
          <button
            className="flex-1 bg-[#0f1319] border border-[#252e42] rounded py-1 text-[10px]"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = [
  'Sections',
  'Preview',
  'Export',
  'Templates',
  'Data Sources',
  'Charts',
  'Compliance',
] as const;

export function Report() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-green-400 border-green-400 bg-green-500/5"
      />
      <Toolbar>
        <ToolbarButton variant="cyan">▶ Build Report</ToolbarButton>
        <ToolbarButton variant="green">Export PDF</ToolbarButton>
        <ToolbarButton>Export DOCX</ToolbarButton>
        <TbSep />
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">
          Template:
        </span>
        <select className="h-6 bg-[#111520] border border-[#252e42] rounded text-[#c5cfe0] text-[11px] px-2 outline-none">
          <option>Pentest Standard</option>
          <option>Executive Summary</option>
          <option>Bug Bounty</option>
        </select>
        <ToolbarButton variant="amber" className="ml-auto" onClick={() => setModalOpen(true)}>
          Auto-Fill from Findings ▾
        </ToolbarButton>
      </Toolbar>
      {activeTab === 'Sections' && <TabSections />}
      {activeTab === 'Preview' && <TabPreview />}
      {activeTab === 'Export' && <TabExport />}
      {activeTab === 'Templates' && <TabTemplates />}
      {activeTab === 'Data Sources' && <TabDataSources />}
      {activeTab === 'Charts' && <TabCharts />}
      {activeTab === 'Compliance' && <TabCompliance />}
      <AutoFillModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
