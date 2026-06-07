import type { ScanWebsiteData } from '../types/scan-website-data';
import React from 'react';

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

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#3d4a61]">{sub}</span>}
    </div>
  );
}

function StatusBadge({ code }: { code: number }) {
  const isSuccess = code >= 200 && code < 300;
  const isRedirect = code >= 300 && code < 400;
  const isClientError = code >= 400 && code < 500;
  const color = isSuccess ? '#30d158' : isRedirect ? '#f5a623' : isClientError ? '#ff6b35' : '#ff2d55';
  return (
    <span
      className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}40`, background: `${color}12` }}
    >
      {code}
    </span>
  );
}

export function WebsiteDirectoryFuzz({ data }: { data: ScanWebsiteData }) {
  const fuzz = data.fuzz;

  if (!fuzz) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">📁</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No directory fuzzing data available. Run a fuzz scan first.
        </div>
      </div>
    );
  }

  const status2xx = fuzz.results.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
  const status3xx = fuzz.results.filter(r => r.statusCode >= 300 && r.statusCode < 400).length;
  const status4xx = fuzz.results.filter(r => r.statusCode >= 400 && r.statusCode < 500).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-6 gap-2 mb-1">
          <StatBox label="URL" value={fuzz.config.url.replace('https://', '')} accent="#0af" />
          <StatBox label="Wordlist" value={fuzz.config.wordlist} accent="#5e5ce6" />
          <StatBox label="Tested" value={fuzz.totalTested.toLocaleString()} accent="#f5a623" />
          <StatBox label="Found" value={fuzz.totalFound} sub="items" accent="#30d158" />
          <StatBox label="Duration" value={`${fuzz.duration}s`} accent="#ff9f0a" />
          <StatBox label="Extensions" value={fuzz.config.extensions?.join(', ') || 'none'} accent="#bf5af2" />
        </div>

        {/* Status distribution */}
        <div className="col-span-2 grid grid-cols-3 gap-2 mb-1">
          <StatBox label="2xx Success" value={status2xx} accent="#30d158" />
          <StatBox label="3xx Redirect" value={status3xx} accent="#f5a623" />
          <StatBox label="4xx Client Err" value={status4xx} accent="#ff6b35" />
        </div>

        {/* Results Table */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
            <SectionHeader accent="#0af">Discovered Paths ({fuzz.totalFound})</SectionHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#060810]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-8">#</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Path</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Status</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Size</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Redirect</th>
                </tr>
              </thead>
              <tbody>
                {fuzz.results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[11px] font-mono text-[#3d4a61]">
                      No paths discovered
                    </td>
                  </tr>
                ) : (
                  fuzz.results.map((r, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[10px] text-[#2a3548]">{idx + 1}</td>
                      <td className="p-2 text-[12px] text-[#0af] font-mono">{r.path}</td>
                      <td className="p-2"><StatusBadge code={r.statusCode} /></td>
                      <td className="p-2 text-[10px] text-[#3d4a61]">{r.contentLength ? `${(r.contentLength / 1024).toFixed(1)} KB` : '—'}</td>
                      <td className="p-2 text-[10px] text-[#f5a623] truncate max-w-[150px]">{r.redirectLocation || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}