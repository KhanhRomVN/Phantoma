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

export function LFI_RFI({ data }: { data: WebsiteAttackData }) {
  const results = data.lfiRfiResults;
  const successCount = results.filter(r => r.status === 'success' && r.vulnerable).length;
  const rceCount = results.filter(r => r.rceAchieved).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Tests Run" value={results.length} sub="LFI/RFI scans" accent="#0af" />
          <StatBox label="Vulnerable" value={successCount} sub="confirmed" accent="#30d158" />
          <StatBox label="RCE Achieved" value={rceCount} sub="LFI → shell" accent="#ff2d55" />
          <StatBox label="Files Read" value={results.filter(r => r.fileContents).length} sub="extracted" accent="#f5a623" />
        </div>

        {results.length === 0 ? (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center">
            <div className="text-[32px] opacity-15 mb-2">📂</div>
            <div className="text-[11px] font-mono text-[#c8d6f0]">No LFI/RFI tests run yet</div>
            <div className="text-[10px] font-mono text-[#2a3548] mt-1">Supports: Path Traversal, PHP Wrappers, RFI, Log Poisoning</div>
          </div>
        ) : (
          results.map((result, idx) => (
            <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SectionHeader accent={result.vulnerable ? '#30d158' : '#ff2d55'}>{result.name}</SectionHeader>
                  <StatusBadge status={result.status} />
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0af12] text-[#0af] border border-[#0af30]">{result.config.type.toUpperCase()}</span>
                  {result.vulnerable && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff2d5512] text-[#ff2d55] border border-[#ff2d5530]">VULNERABLE</span>}
                  {result.rceAchieved && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#30d15812] text-[#30d158] border border-[#30d15830]">RCE</span>}
                </div>
                <span className="text-[10px] font-mono text-[#c8d6f0]">{new Date(result.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Configuration</div>
                  <KV k="URL" v={result.config.url} vc="text-[#0af]" />
                  <KV k="Parameter" v={result.config.parameter} vc="text-[#f5a623]" />
                  <KV k="Attack Type" v={result.config.type.toUpperCase()} />
                  {result.config.filePath && <KV k="Target File" v={result.config.filePath} vc="text-[#ff6b35]" />}
                </div>
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Results</div>
                  <KV k="Vulnerable" v={result.vulnerable ? 'YES ✓' : 'NO ✗'} vc={result.vulnerable ? 'text-[#30d158]' : 'text-[#ff2d55]'} />
                  <KV k="RCE Achieved" v={result.rceAchieved ? 'YES ✓' : 'NO ✗'} vc={result.rceAchieved ? 'text-[#30d158]' : 'text-[#c8d6f0]'} />
                </div>
              </div>

              {result.fileContents && (
                <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#30d158] uppercase mb-1">File Contents</div>
                  <ExpandableRaw content={result.fileContents} />
                </div>
              )}

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
          <SectionHeader accent="#30d158">Launch LFI/RFI Attack</SectionHeader>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="col-span-2">
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Target URL</label>
              <input type="text" defaultValue={data.targetUrl + '/page.php?file='} className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none" style={{ caretColor: '#0af' }} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Attack Type</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                <option value="lfi">LFI — Local File Inclusion</option>
                <option value="rfi">RFI — Remote File Inclusion</option>
                <option value="lfi_to_rce">LFI → RCE (Log Poisoning)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Target File / URL</label>
              <input type="text" placeholder="../../../../etc/passwd" className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#ff6b35] outline-none placeholder:text-[#2a3548]" style={{ caretColor: '#ff6b35' }} />
            </div>
          </div>
          <button className="h-8 px-4 rounded text-[11px] font-bold font-mono transition-colors" style={{ background: '#30d15815', border: '1px solid #30d15830', color: '#30d158' }}>📂 Launch LFI/RFI</button>
        </div>
      </div>
    </div>
  );
}