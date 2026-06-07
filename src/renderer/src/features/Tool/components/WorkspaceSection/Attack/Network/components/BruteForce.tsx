import type { NetworkAttackData, BruteForceResult, BruteForceService } from '../types/network-attack';
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

const SERVICE_LABELS: Record<BruteForceService, string> = {
  ssh: 'SSH',
  rdp: 'RDP',
  ftp: 'FTP',
  telnet: 'Telnet',
  smb: 'SMB',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  'http-post-form': 'HTTP Form',
};

export function BruteForce({ data }: { data: NetworkAttackData }) {
  const results = data.bruteForceResults;
  const successCount = results.filter((r) => r.status === 'success').length;
  const totalCredentials = results.reduce((sum, r) => sum + r.credentialsFound.length, 0);
  const totalAttempts = results.reduce((sum, r) => sum + r.attemptsTotal, 0);

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Campaigns" value={results.length} sub="services attacked" accent="#0af" />
          <StatBox label="Successful" value={successCount} sub="credentials found" accent="#30d158" />
          <StatBox label="Credentials" value={totalCredentials} sub="compromised" accent="#f5a623" />
          <StatBox label="Total Attempts" value={totalAttempts.toLocaleString()} sub="across all services" accent="#ff6b35" />
        </div>

        {/* Brute-force Results */}
        {results.length === 0 ? (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center">
            <div className="text-[32px] opacity-15 mb-2">🔑</div>
            <div className="text-[11px] font-mono text-[#c8d6f0]">No brute-force attacks run yet</div>
            <div className="text-[10px] font-mono text-[#2a3548] mt-1">Target services: SSH, RDP, FTP, SMB, and more</div>
          </div>
        ) : (
          results.map((result, idx) => (
            <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SectionHeader accent={result.status === 'success' ? '#30d158' : '#ff2d55'}>
                    {SERVICE_LABELS[result.config.service]} Brute-force
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
                  <KV k="Service" v={SERVICE_LABELS[result.config.service]} vc="text-[#0af]" />
                  <KV k="Target" v={`${result.config.target}:${result.config.port}`} vc="text-[#0af]" />
                  <KV k="Threads" v={result.config.threads || 16} />
                  <KV k="Timeout" v={`${result.config.timeout || 5}s`} />
                </div>

                {/* Stats Card */}
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Attack Stats</div>
                  <KV k="Attempts" v={`${result.attemptsMade} / ${result.attemptsTotal}`} />
                  <KV k="Speed" v={`${result.speed.toFixed(1)} req/s`} vc="text-[#f5a623]" />
                  <KV k="Credentials" v={result.credentialsFound.length} vc={result.credentialsFound.length > 0 ? 'text-[#30d158]' : 'text-[#ff2d55]'} />
                  {result.duration && (
                    <KV k="Duration" v={`${(result.duration / 1000).toFixed(1)}s`} />
                  )}
                </div>
              </div>

              {/* Credentials Found */}
              {result.credentialsFound.length > 0 && (
                <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#30d158] uppercase mb-1">Credentials Found</div>
                  {result.credentialsFound.map((cred, ci) => (
                    <div key={ci} className="flex gap-4 py-1 border-b border-[#111827] last:border-0">
                      <span className="text-[11px] font-mono text-[#c8d6f0]">{cred.username}</span>
                      <span className="text-[11px] font-mono text-[#f5a623]">:{cred.password}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Output */}
              {result.output && (
                <div className="mt-2 bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Output</div>
                  <ExpandableRaw content={result.output} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Attack Configuration Form */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#f5a623">Launch Brute-force</SectionHeader>
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
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Service</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                <option value="ssh">SSH (22)</option>
                <option value="rdp">RDP (3389)</option>
                <option value="ftp">FTP (21)</option>
                <option value="telnet">Telnet (23)</option>
                <option value="smb">SMB (445)</option>
                <option value="mysql">MySQL (3306)</option>
                <option value="postgresql">PostgreSQL (5432)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Username Wordlist</label>
              <input
                type="text"
                placeholder="/wordlists/users.txt"
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#c8d6f0' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Password Wordlist</label>
              <input
                type="text"
                placeholder="/wordlists/rockyou.txt"
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#c8d6f0' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Threads</label>
              <input
                type="number"
                defaultValue={16}
                className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#f5a623] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#f5a623' }}
              />
            </div>
          </div>
          <button className="h-8 px-4 rounded text-[11px] font-bold font-mono transition-colors" style={{ background: '#f5a62315', border: '1px solid #f5a62330', color: '#f5a623' }}>
            🔑 Launch Brute-force
          </button>
        </div>
      </div>
    </div>
  );
}