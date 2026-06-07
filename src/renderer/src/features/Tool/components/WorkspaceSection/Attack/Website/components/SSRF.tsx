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

const COMMON_SSRF_TARGETS = [
  { label: 'Localhost', url: 'http://127.0.0.1:80' },
  { label: 'AWS Metadata', url: 'http://169.254.169.254/latest/meta-data/' },
  { label: 'GCP Metadata', url: 'http://metadata.google.internal/' },
  { label: 'Azure Metadata', url: 'http://169.254.169.254/metadata/instance?api-version=2020-09-01' },
  { label: 'Internal Admin', url: 'http://localhost/admin' },
];

export function SSRF({ data }: { data: WebsiteAttackData }) {
  const results = data.ssrfResults;
  const successCount = results.filter(r => r.status === 'success' && r.vulnerable).length;
  const internalCount = results.filter(r => r.accessedInternal).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Tests Run" value={results.length} sub="SSRF probes" accent="#0af" />
          <StatBox label="Vulnerable" value={successCount} sub="confirmed SSRF" accent="#30d158" />
          <StatBox label="Internal Access" value={internalCount} sub="reached internal" accent="#ff2d55" />
          <StatBox label="Cloud Metadata" value={results.filter(r => r.cloudMetadata).length} sub="exposed" accent="#f5a623" />
        </div>

        {results.length === 0 ? (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center">
            <div className="text-[32px] opacity-15 mb-2">🔄</div>
            <div className="text-[11px] font-mono text-[#c8d6f0]">No SSRF tests run yet</div>
            <div className="text-[10px] font-mono text-[#2a3548] mt-1">Probes: Localhost, Cloud Metadata (AWS/GCP/Azure), Internal services</div>
          </div>
        ) : (
          results.map((result, idx) => (
            <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SectionHeader accent={result.vulnerable ? '#30d158' : '#ff2d55'}>{result.name}</SectionHeader>
                  <StatusBadge status={result.status} />
                  {result.vulnerable && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff2d5512] text-[#ff2d55] border border-[#ff2d5530]">VULNERABLE</span>}
                  {result.accessedInternal && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f5a62312] text-[#f5a623] border border-[#f5a62330]">INTERNAL</span>}
                </div>
                <span className="text-[10px] font-mono text-[#c8d6f0]">{new Date(result.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Configuration</div>
                  <KV k="URL" v={result.config.url} vc="text-[#0af]" />
                  <KV k="Parameter" v={result.config.parameter} vc="text-[#f5a623]" />
                  <KV k="SSRF Target" v={result.config.targetUrl} vc="text-[#ff2d55]" />
                </div>
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Results</div>
                  <KV k="Vulnerable" v={result.vulnerable ? 'YES ✓' : 'NO ✗'} vc={result.vulnerable ? 'text-[#30d158]' : 'text-[#ff2d55]'} />
                  <KV k="Internal Access" v={result.accessedInternal ? 'YES ✓' : 'NO ✗'} vc={result.accessedInternal ? 'text-[#f5a623]' : 'text-[#c8d6f0]'} />
                  <KV k="Cloud Metadata" v={result.cloudMetadata ? 'EXPOSED' : '—'} vc={result.cloudMetadata ? 'text-[#ff2d55]' : 'text-[#c8d6f0]'} />
                </div>
              </div>

              {result.responseBody && (
                <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Response</div>
                  <ExpandableRaw content={result.responseBody} />
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
          <SectionHeader accent="#bf5af2">Launch SSRF Attack</SectionHeader>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="col-span-2">
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Target URL</label>
              <input type="text" defaultValue={data.targetUrl + '/proxy.php?url='} className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none" style={{ caretColor: '#0af' }} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">SSRF Target</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                {COMMON_SSRF_TARGETS.map((t, i) => <option key={i} value={t.url}>{t.label} — {t.url}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Bypass Method</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                <option value="">None (direct)</option>
                <option value="redirect">Open Redirect</option>
                <option value="dns">DNS Rebinding</option>
                <option value="url_encoding">URL Encoding</option>
              </select>
            </div>
          </div>
          <button className="h-8 px-4 rounded text-[11px] font-bold font-mono transition-colors" style={{ background: '#bf5af215', border: '1px solid #bf5af230', color: '#bf5af2' }}>🔄 Launch SSRF Probe</button>
        </div>
      </div>
    </div>
  );
}