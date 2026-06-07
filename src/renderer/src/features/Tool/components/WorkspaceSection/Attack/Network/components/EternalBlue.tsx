import type { NetworkAttackData, EternalBlueResult } from '../types/network-attack';
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

export function EternalBlue({ data }: { data: NetworkAttackData }) {
  const results = data.eternalBlueResults;
  const successCount = results.filter((r) => r.status === 'success').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Attempts" value={results.length} sub="MS17-010 exploits" accent="#0af" />
          <StatBox label="Successful" value={successCount} sub="shells obtained" accent="#30d158" />
          <StatBox label="Failed" value={failedCount} sub="not vulnerable" accent="#ff2d55" />
          <StatBox label="Target Port" value="445" sub="SMB" accent="#f5a623" />
        </div>

        {/* EternalBlue Results */}
        {results.length === 0 ? (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center">
            <div className="text-[32px] opacity-15 mb-2">💣</div>
            <div className="text-[11px] font-mono text-[#c8d6f0]">No EternalBlue exploits run yet</div>
            <div className="text-[10px] font-mono text-[#2a3548] mt-1">Target Windows systems on port 445</div>
          </div>
        ) : (
          results.map((result, idx) => (
            <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SectionHeader accent={result.status === 'success' ? '#30d158' : '#ff2d55'}>
                    {result.name}
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
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Configuration</div>
                  <KV k="Target" v={result.config.target} vc="text-[#0af]" />
                  <KV k="Payload" v={result.config.payload} />
                  <KV k="LHOST" v={result.config.lhost} vc="text-[#30d158]" />
                  <KV k="LPORT" v={result.config.lport} vc="text-[#30d158]" />
                </div>

                {/* Result Card */}
                {result.status === 'success' && result.systemInfo && (
                  <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                    <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">System Info</div>
                    <KV k="OS" v={result.systemInfo.os} vc="text-[#f5a623]" />
                    <KV k="Architecture" v={result.systemInfo.architecture} />
                    <KV k="Domain" v={result.systemInfo.domain || 'WORKGROUP'} />
                    <KV k="Shell Type" v={result.shellType || 'N/A'} vc="text-[#30d158]" />
                    {result.systemInfo.loggedUsers && (
                      <KV k="Logged Users" v={result.systemInfo.loggedUsers.join(', ')} />
                    )}
                  </div>
                )}
              </div>

              {/* Output */}
              {result.output && (
                <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Output</div>
                  <ExpandableRaw content={result.output} />
                </div>
              )}

              {/* Duration */}
              {result.duration && (
                <div className="mt-2 text-[10px] font-mono text-[#c8d6f0]">
                  Duration: {(result.duration / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          ))
        )}

        {/* Attack Configuration Form */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Launch EternalBlue</SectionHeader>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Target IP</label>
              <input
                type="text"
                defaultValue={data.targetIp}
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#0af' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">LHOST (Listener)</label>
              <input
                type="text"
                placeholder="192.168.1.100"
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#30d158] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#30d158' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Payload</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                <option>windows/x64/meterpreter/reverse_tcp</option>
                <option>windows/x64/shell/reverse_tcp</option>
                <option>windows/x64/meterpreter/reverse_https</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">LPORT</label>
              <input
                type="number"
                defaultValue={4444}
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#30d158] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#30d158' }}
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