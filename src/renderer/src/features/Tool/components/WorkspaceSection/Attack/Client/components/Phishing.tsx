import type { ClientAttackData } from '../types/client-attack';
import React from 'react';
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

export function Phishing({ data }: { data: ClientAttackData }) {
  const results = data.phishingResults;
  const totalCreds = results.reduce((s, r) => s + r.credentialsCaptured.length, 0);
  const totalSent = results.reduce((s, r) => s + r.emailsSent, 0);

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Campaigns" value={results.length} sub="phishing runs" accent="#0af" />
          <StatBox label="Emails Sent" value={totalSent} sub="across all campaigns" accent="#f5a623" />
          <StatBox label="Credentials" value={totalCreds} sub="captured" accent="#30d158" />
          <StatBox label="Sessions" value={results.reduce((s, r) => s + r.sessionsEstablished, 0)} sub="hijacked" accent="#ff2d55" />
        </div>

        {results.length === 0 ? (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center">
            <div className="text-[32px] opacity-15 mb-2">🎣</div>
            <div className="text-[11px] font-mono text-[#c8d6f0]">No phishing campaigns run yet</div>
            <div className="text-[10px] font-mono text-[#2a3548] mt-1">Supports: Office365, Gmail, VPN, Custom — with MFA capture</div>
          </div>
        ) : (
          results.map((result, idx) => (
            <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SectionHeader accent="#f5a623">{result.name}</SectionHeader>
                  <StatusBadge status={result.status} />
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0af12] text-[#0af] border border-[#0af30]">{result.config.platform.toUpperCase()}</span>
                </div>
                <span className="text-[10px] font-mono text-[#c8d6f0]">{new Date(result.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Delivery</div>
                  <KV k="Sent" v={result.emailsSent} />
                  <KV k="Opened" v={`${result.emailsOpened} (${result.emailsSent > 0 ? ((result.emailsOpened / result.emailsSent) * 100).toFixed(0) : 0}%)`} />
                  <KV k="Clicked" v={`${result.emailsClicked} (${result.emailsSent > 0 ? ((result.emailsClicked / result.emailsSent) * 100).toFixed(1) : 0}%)`} />
                </div>
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Config</div>
                  <KV k="Platform" v={result.config.platform} />
                  <KV k="MFA Capture" v={result.config.mfaCapture ? 'ENABLED' : 'DISABLED'} vc={result.config.mfaCapture ? 'text-[#30d158]' : 'text-[#c8d6f0]'} />
                  <KV k="Landing Page" v={result.landingPageUrl} vc="text-[#ff6b35]" />
                </div>
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Results</div>
                  <KV k="Credentials" v={result.credentialsCaptured.length} vc="text-[#30d158]" />
                  <KV k="Sessions" v={result.sessionsEstablished} vc="text-[#ff2d55]" />
                  <KV k="MFA Tokens" v={result.credentialsCaptured.filter(c => c.mfaToken).length} vc="text-[#f5a623]" />
                </div>
              </div>

              {result.credentialsCaptured.length > 0 && (
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2 mb-2">
                  <div className="text-[10px] font-mono text-[#30d158] uppercase mb-1">Captured Credentials</div>
                  {result.credentialsCaptured.map((cred, ci) => (
                    <div key={ci} className="flex flex-wrap gap-x-3 py-0.5 border-b border-[#111827] last:border-0">
                      <span className="text-[11px] font-mono text-[#c8d6f0]">{cred.email}</span>
                      <span className="text-[11px] font-mono text-[#f5a623]">{cred.password}</span>
                      {cred.mfaToken && <span className="text-[10px] font-mono text-[#30d158]">MFA: {cred.mfaToken}</span>}
                    </div>
                  ))}
                </div>
              )}

              {result.output && (
                <div className="bg-[#0a0e14] border border-[#111827] rounded p-2">
                  <div className="text-[10px] font-mono text-[#c8d6f0] uppercase mb-1">Output</div>
                  <ExpandableRaw content={result.output} />
                </div>
              )}
            </div>
          ))
        )}

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#f5a623">Launch Phishing Campaign</SectionHeader>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Platform</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                <option value="office365">Office365</option>
                <option value="gmail">Gmail / G Suite</option>
                <option value="vpn">Corporate VPN</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Clone URL (optional)</label>
              <input type="text" placeholder="https://login.microsoftonline.com" className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none placeholder:text-[#2a3548]" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">Landing Domain</label>
              <input type="text" placeholder="login-verify.target.com.tk" className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#ff6b35] outline-none placeholder:text-[#2a3548]" style={{ caretColor: '#ff6b35' }} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#c8d6f0] uppercase block mb-1">SSL Certificate</label>
              <select className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#c8d6f0] outline-none">
                <option value="letsencrypt">Let's Encrypt</option>
                <option value="self-signed">Self-Signed</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#30d158]" />
                <span className="text-[10px] font-mono text-[#c8d6f0]">Enable MFA Capture</span>
              </label>
            </div>
          </div>
          <button className="h-8 px-4 rounded text-[11px] font-bold font-mono transition-colors" style={{ background: '#f5a62315', border: '1px solid #f5a62330', color: '#f5a623' }}>🎣 Launch Phishing</button>
        </div>
      </div>
    </div>
  );
}