import { useState } from 'react';
import { RISK_COLOR, SectionHeader, RiskPill } from '../../shared-ui';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortEntry {
  port: number;
  proto: string;
  state: string;
  service: string;
  product: string;
  risk: string;
  cves: string[];
}

interface VulnEntry {
  id: string;
  name: string;
  severity: string;
  url: string;
  description: string;
  tool: string;
}

interface PhaseResult {
  phase: 'discover' | 'deep' | 'vuln';
  tool: string;
  success: boolean;
  ports?: PortEntry[];
  vulns?: VulnEntry[];
  raw?: string;
  error?: string;
}

interface ScanSummary {
  openPorts: number;
  totalVulns: number;
  criticalVuln: number;
  highVuln: number;
}

interface PipelineScanResult {
  target: string;
  phases: PhaseResult[];
  summary: ScanSummary;
}

type ScanState =
  | { status: 'idle' }
  | { status: 'scanning'; phase: string }
  | { status: 'done'; data: PipelineScanResult }
  | { status: 'error'; message: string };

// ── Color helpers ─────────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#f5a623',
  low: '#30d158',
  info: '#4a5a7a',
};

function sevColor(s: string) {
  return SEVERITY_COLOR[s?.toLowerCase()] ?? '#4a5a7a';
}
function riskColor(r: string) {
  return RISK_COLOR[r?.toLowerCase()] ?? '#636366';
}

// ── Phase badge ───────────────────────────────────────────────────────────────
const PHASE_META = {
  discover: { label: 'Tầng 1 · RustScan', accent: '#0af', icon: '⚡' },
  deep: { label: 'Tầng 2 · Nmap', accent: '#bf5af2', icon: '🔬' },
  vuln: { label: 'Tầng 4 · Vuln', accent: '#ff6b35', icon: '🎯' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function PhaseBadge({ phase, tool, success, error }: Partial<PhaseResult>) {
  const meta = PHASE_META[phase as keyof typeof PHASE_META] ?? {
    label: phase,
    accent: '#4a5a7a',
    icon: '·',
  };
  const c = error ? '#ff2d55' : success ? meta.accent : '#3a4558';
  return (
    <span
      className="inline-flex items-center gap-1 text-[8px] font-bold font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
      style={{ color: c, border: `1px solid ${c}40`, background: `${c}12` }}
    >
      {meta.icon} {tool ?? meta.label}
    </span>
  );
}

function PortTable({ ports }: { ports: PortEntry[] }) {
  return (
    <table className="w-full text-[10px] font-mono">
      <thead>
        <tr className="border-b border-[#1c2333]">
          {['Port', 'Proto', 'Service', 'Product', 'State', 'Risk', 'CVEs'].map((h) => (
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
          <tr key={i} className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors">
            <td className="p-1.5 font-bold" style={{ color: riskColor(p.risk) }}>
              {p.port}
            </td>
            <td className="p-1.5 text-[#3a4558]">{p.proto}</td>
            <td className="p-1.5 text-[#8da0c0]">{p.service || '—'}</td>
            <td className="p-1.5 text-[#4a5a7a]">{p.product || '—'}</td>
            <td className="p-1.5">
              <span className={p.state === 'open' ? 'text-[#30d158]' : 'text-[#3a4558]'}>
                {p.state}
              </span>
            </td>
            <td className="p-1.5">
              <RiskPill level={p.risk} />
            </td>
            <td className="p-1.5 text-[#ff2d55]">{p.cves?.join(', ') || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VulnList({ vulns }: { vulns: VulnEntry[] }) {
  return (
    <div className="space-y-1.5">
      {vulns.map((v, i) => {
        const c = sevColor(v.severity);
        return (
          <div
            key={i}
            className="border rounded p-2"
            style={{ borderColor: `${c}25`, background: `${c}06` }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold" style={{ color: c }}>
                  {v.name}
                </span>
                {v.id && <span className="text-[8px] font-mono text-[#3a4558]">{v.id}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-[#3a4558] bg-[#111827] px-1.5 py-0.5 rounded">
                  {v.tool}
                </span>
                <span
                  className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
                  style={{ color: c, border: `1px solid ${c}40`, background: `${c}12` }}
                >
                  {v.severity}
                </span>
              </div>
            </div>
            {v.url && (
              <div className="text-[8px] font-mono text-[#0af] mb-0.5 truncate">{v.url}</div>
            )}
            {v.description && (
              <div className="text-[9px] text-[#6a7a9a] leading-relaxed">{v.description}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhaseCard({ phase }: { phase: PhaseResult }) {
  const [expanded, setExpanded] = useState(false);
  const meta = PHASE_META[phase.phase as keyof typeof PHASE_META] ?? {
    label: phase.phase,
    accent: '#4a5a7a',
    icon: '·',
  };
  const portCount = phase.ports?.length ?? 0;
  const vulnCount = phase.vulns?.length ?? 0;
  const hasContent = portCount > 0 || vulnCount > 0;

  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
      {/* Phase header */}
      <button
        onClick={() => hasContent && setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#111827] transition-colors"
        style={{ cursor: hasContent ? 'pointer' : 'default' }}
      >
        <div className="w-px h-4 rounded-full shrink-0" style={{ background: meta.accent }} />
        <span
          className="text-[9px] font-bold font-mono uppercase tracking-widest"
          style={{ color: meta.accent + 'bb' }}
        >
          {meta.icon} {meta.label}
        </span>
        <PhaseBadge {...phase} />
        <div className="ml-auto flex items-center gap-3">
          {portCount > 0 && (
            <span className="text-[9px] font-mono text-[#0af]">{portCount} ports</span>
          )}
          {vulnCount > 0 && (
            <span className="text-[9px] font-mono text-[#ff6b35]">{vulnCount} findings</span>
          )}
          {phase.error && (
            <span className="text-[9px] font-mono text-[#ff2d55] truncate max-w-xs">
              {phase.error}
            </span>
          )}
          {hasContent && (
            <span className="text-[9px] font-mono text-[#3a4558]">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#1c2333] p-3">
          {(phase.ports?.length ?? 0) > 0 && (
            <div className="mb-3">
              <SectionHeader accent={meta.accent}>Port Results</SectionHeader>
              <PortTable ports={phase.ports!} />
            </div>
          )}
          {(phase.vulns?.length ?? 0) > 0 && (
            <div>
              <SectionHeader accent="#ff6b35">Vulnerability Findings</SectionHeader>
              <VulnList vulns={phase.vulns!} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scan form ─────────────────────────────────────────────────────────────────
function ScanForm({
  onScan,
  scanning,
  phase,
}: {
  onScan: (target: string, ports: string, phases: string[]) => void;
  scanning: boolean;
  phase: string;
}) {
  const [target, setTarget] = useState('');
  // Hardcoded ports range (always scan all ports)
  const ports = '1-65535';
  // Hardcoded phases (always run all three tiers)
  const phases = ['discover', 'deep', 'vuln'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    onScan(target.trim(), ports, phases);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3 flex flex-col gap-3"
    >
      {/* Target row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[9px] font-mono text-[#2a3548] shrink-0">TARGET</span>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="192.168.1.1 or example.com"
            spellCheck={false}
            className="flex-1 h-6 bg-[#060810] border border-[#1c2333] rounded px-2 text-[10px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]"
            style={{ caretColor: '#0af' }}
          />
        </div>
        <button
          type="submit"
          disabled={scanning || !target.trim()}
          className="h-6 px-3 rounded text-[9px] font-bold font-mono uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          style={{ background: '#ff2d5515', border: '1px solid #ff2d5530', color: '#ff2d55' }}
        >
          {scanning ? (
            <>
              <span className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />{' '}
              {phase}
            </>
          ) : (
            '▶ Run Pipeline'
          )}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TabPorts() {
  const [state, setState] = useState<ScanState>({ status: 'idle' });

  const runScan = async (target: string, ports: string, phases: string[]) => {
    setState({ status: 'scanning', phase: 'starting...' });

    const serverUrl = (
      localStorage.getItem('phantoma_server_url') ?? 'http://localhost:8080'
    ).replace(/\/$/, '');

    try {
      const ipc = (window as any).api?.invoke as
        | ((channel: string, ...args: any[]) => Promise<any>)
        | undefined;

      let text: string;
      let ok: boolean;
      let httpStatus: number;

      const body = JSON.stringify({ target, ports, phases });

      if (ipc) {
        const result = await ipc('phantoma:fetch', `${serverUrl}/api/v1/scan/full`, 'POST', body);
        if (result.error) throw new Error(result.error);
        text = result.body;
        ok = result.ok;
        httpStatus = result.status;
      } else {
        const res = await fetch(`${serverUrl}/api/v1/scan/full`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(20 * 60 * 1000),
        });
        text = await res.text();
        ok = res.ok;
        httpStatus = res.status;
      }

      let json: { success: boolean; data: PipelineScanResult; error?: string };
      try {
        json = JSON.parse(text);
      } catch (e) {
        setState({
          status: 'error',
          message: `JSON parse error: ${e}\n\nRaw: ${text.slice(0, 300)}`,
        });
        return;
      }

      if (!ok || !json.success) {
        setState({ status: 'error', message: json.error ?? `HTTP ${httpStatus}` });
        return;
      }

      setState({ status: 'done', data: json.data });
    } catch (e: unknown) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Connection failed' });
    }
  };

  const data = state.status === 'done' ? state.data : null;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Scan form */}
        <ScanForm
          onScan={runScan}
          scanning={state.status === 'scanning'}
          phase={state.status === 'scanning' ? state.phase : ''}
        />

        {/* Error */}
        {state.status === 'error' && (
          <div
            className="col-span-2 flex items-start gap-2 px-3 py-2 rounded text-[9px] font-mono whitespace-pre-wrap"
            style={{ background: '#ff2d5510', border: '1px solid #ff2d5530', color: '#ff2d55' }}
          >
            <span className="shrink-0">✗</span>
            <span>{state.message}</span>
          </div>
        )}

        {/* Idle placeholder */}
        {state.status === 'idle' && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-[32px] opacity-15">⬡</span>
            <span className="text-[10px] font-mono text-[#2a3548]">
              Select phases and run pipeline to start scanning
            </span>
            <div className="flex items-center gap-4 text-[8px] font-mono text-[#2a3548]">
              <span>⚡ Tầng 1: RustScan — full 65k port discovery</span>
              <span>🔬 Tầng 2: Nmap — deep service/CVE scan</span>
              <span>🎯 Tầng 4: Nuclei + Nikto — vuln templates</span>
            </div>
          </div>
        )}

        {/* Scanning indicator */}
        {state.status === 'scanning' && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-[#0af] border-t-transparent animate-spin" />
            <span className="text-[10px] font-mono text-[#4a5a7a]">
              Pipeline running — may take several minutes...
            </span>
            <div className="flex gap-2">
              {[
                { id: 'discover', label: 'Tầng 1 · RustScan', icon: '⚡', accent: '#0af' },
                { id: 'deep', label: 'Tầng 2 · Nmap', icon: '🔬', accent: '#bf5af2' },
                { id: 'vuln', label: 'Tầng 4 · Vuln', icon: '🎯', accent: '#ff6b35' },
              ].map((p) => (
                <span
                  key={p.id}
                  className="text-[8px] font-mono px-2 py-0.5 rounded"
                  style={{ color: p.accent + '80', border: `1px solid ${p.accent}20` }}
                >
                  {p.icon} {p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Summary */}
            <div className="col-span-2 grid grid-cols-5 gap-2">
              {[
                { label: 'Target', value: data.target, accent: '#30d158' },
                { label: 'Open Ports', value: data.summary.openPorts, accent: '#0af' },
                { label: 'Findings', value: data.summary.totalVulns, accent: '#ff6b35' },
                { label: 'Critical', value: data.summary.criticalVuln, accent: '#ff2d55' },
                { label: 'High', value: data.summary.highVuln, accent: '#ff6b35' },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className="p-2.5 bg-[#0d1017] border border-[#1c2333] rounded flex flex-col gap-0.5"
                >
                  <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">
                    {label}
                  </span>
                  <span
                    className="text-[15px] font-bold font-mono leading-none truncate"
                    style={{ color: accent }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Phase cards */}
            <div className="col-span-2 flex flex-col gap-2">
              {data.phases.map((phase, i) => (
                <PhaseCard key={`${phase.phase}-${phase.tool}-${i}`} phase={phase} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
