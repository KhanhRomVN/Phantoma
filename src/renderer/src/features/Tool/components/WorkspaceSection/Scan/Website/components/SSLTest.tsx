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

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#2a3548] uppercase tracking-wide">{k}</span>
      <span className="text-[12px] font-mono" style={{ color: vc === 'text-[#c8d6f0]' ? '#c8d6f0' : vc }}>{v}</span>
    </div>
  );
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  const color = value ? '#ff2d55' : '#30d158';
  const text = value ? 'VULNERABLE' : 'SAFE';
  return (
    <span
      className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}40`, background: `${color}12` }}
    >
      {label}: {text}
    </span>
  );
}

export function WebsiteSSLTest({ data }: { data: ScanWebsiteData }) {
  const sslTest = data.sslTest;

  if (!sslTest) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔒</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No SSL/TLS test data available. Run an SSL test first.
        </div>
      </div>
    );
  }

  const certDaysColor = sslTest.certificate.daysLeft > 90 ? '#30d158' : sslTest.certificate.daysLeft > 30 ? '#f5a623' : '#ff2d55';

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-5 gap-2 mb-1">
          <StatBox label="Host" value={sslTest.host} accent="#0af" />
          <StatBox label="Grade" value={sslTest.grade || 'N/A'} accent="#30d158" />
          <StatBox label="TLS Versions" value={sslTest.tlsVersions.length} accent="#5e5ce6" />
          <StatBox label="Weak Ciphers" value={sslTest.weakCiphers.length} accent="#ff2d55" />
          <StatBox label="Duration" value={`${sslTest.duration}s`} accent="#ff9f0a" />
        </div>

        {/* Certificate */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Certificate</SectionHeader>
          <KV k="Issuer" v={sslTest.certificate.issuer} />
          <KV k="Subject" v={sslTest.certificate.subject} vc="#0af" />
          <KV k="Expiry" v={sslTest.certificate.expiry} vc={certDaysColor} />
          <KV k="Days Left" v={sslTest.certificate.daysLeft} vc={certDaysColor} />
        </div>

        {/* TLS Versions */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#5e5ce6">TLS Versions</SectionHeader>
          <div className="flex flex-wrap gap-1.5">
            {sslTest.tlsVersions.length === 0 ? (
              <span className="text-[10px] font-mono text-[#3d4a61]">None detected</span>
            ) : (
              sslTest.tlsVersions.map((v, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-2 py-1 rounded"
                  style={{ color: '#30d158', border: '1px solid #30d15830', background: '#30d15810' }}
                >
                  {v}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Vulnerabilities */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Known Vulnerabilities</SectionHeader>
          <div className="flex flex-wrap gap-2">
            <BoolBadge value={sslTest.heartbleed} label="Heartbleed" />
            <BoolBadge value={sslTest.poodle} label="POODLE" />
            <BoolBadge value={sslTest.robot} label="ROBOT" />
          </div>
        </div>

        {/* Cipher Suites */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff9f0a">Cipher Suites ({sslTest.cipherSuites.length})</SectionHeader>
          <div className="space-y-1">
            {sslTest.cipherSuites.length === 0 ? (
              <span className="text-[10px] font-mono text-[#3d4a61]">No cipher suites detected</span>
            ) : (
              sslTest.cipherSuites.map((cipher, i) => {
                const isWeak = sslTest.weakCiphers.includes(cipher);
                return (
                  <div
                    key={i}
                    className="text-[10px] font-mono px-2 py-1 rounded"
                    style={{
                      color: isWeak ? '#ff2d55' : '#c8d6f0',
                      background: isWeak ? '#ff2d5508' : '#060810',
                      border: `1px solid ${isWeak ? '#ff2d5525' : '#111827'}`,
                    }}
                  >
                    {cipher}
                    {isWeak && <span className="ml-2 text-[#ff2d55]">⚠ WEAK</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}