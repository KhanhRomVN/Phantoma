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

function RiskBar({ label, score, max = 10, color }: { label: string; score: number; max?: number; color: string }) {
  const percentage = Math.min((score / max) * 100, 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] font-mono mb-0.5">
        <span className="text-[#c8d6f0]">{label}</span>
        <span className="text-[#c8d6f0]">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function WebsiteOverview({ data }: { data: ScanWebsiteData }) {
  const fuzz = data.fuzz;
  const vulnScan = data.vulnScan;
  const sslTest = data.sslTest;
  const headers = data.headers;

  const dirsFound = fuzz?.totalFound ?? 0;
  const vulnsTotal = vulnScan?.totalFindings ?? 0;
  const vulnsCritical = vulnScan?.critical ?? 0;
  const vulnsHigh = vulnScan?.high ?? 0;
  const sslGrade = sslTest?.grade ?? 'N/A';
  const headersPassed = headers?.present ?? 0;
  const headersTotal = headers?.totalChecked ?? 0;

  const overallRisk = Math.min(
    Math.round(vulnsCritical * 3 + vulnsHigh * 2 + (vulnsTotal - vulnsCritical - vulnsHigh) * 0.5),
    10
  );
  const riskColor = overallRisk >= 7 ? '#ff2d55' : overallRisk >= 4 ? '#f5a623' : '#30d158';

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Target Header */}
        <div className="col-span-2 bg-gradient-to-r from-[#0a0e14] to-[#0d1017] border border-[#1c2333] rounded p-3 mb-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[20px] font-bold font-mono text-[#ff2d55]">{data.target}</div>
              <div className="text-[10px] font-mono text-[#2a3548] mt-0.5">Web Application Scan Target</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#2a3548]">Risk Score</div>
              <div className="text-[28px] font-bold font-mono" style={{ color: riskColor }}>{overallRisk}</div>
              <div className="text-[9px] text-[#3d4a61]">/ 10</div>
            </div>
          </div>
        </div>

        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-5 gap-2 mb-1">
          <StatBox label="Directories" value={dirsFound} sub="discovered" accent="#0af" />
          <StatBox label="Vulnerabilities" value={vulnsTotal} sub={`${vulnsCritical} critical`} accent="#ff2d55" />
          <StatBox label="SSL Grade" value={sslGrade} sub={sslTest ? `${sslTest.tlsVersions.length} TLS versions` : ''} accent="#30d158" />
          <StatBox label="Headers" value={`${headersPassed}/${headersTotal}`} sub="passed" accent="#5e5ce6" />
          <StatBox label="Scan Time" value={data.scanTime.split('T')[0]} sub={data.scanTime.split('T')[1]?.split('Z')[0] || ''} accent="#f5a623" />
        </div>

        {/* Fuzz Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Directory Fuzzing</SectionHeader>
          {fuzz ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Wordlist</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{fuzz.config.wordlist}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Found</span>
                <span className="text-[11px] font-mono text-[#0af]">{dirsFound}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Duration</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{fuzz.duration}s</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        {/* Vuln Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Vulnerabilities</SectionHeader>
          {vulnScan ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Critical</span>
                <span className="text-[11px] font-mono text-[#ff2d55]">{vulnsCritical}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">High</span>
                <span className="text-[11px] font-mono text-[#ff6b35]">{vulnsHigh}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Total</span>
                <span className="text-[11px] font-mono text-[#f5a623]">{vulnsTotal}</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        {/* SSL Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">SSL/TLS</SectionHeader>
          {sslTest ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Grade</span>
                <span className="text-[11px] font-mono text-[#30d158] font-bold">{sslGrade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Cert Days Left</span>
                <span className="text-[11px] font-mono text-[#30d158]">{sslTest.certificate.daysLeft}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Weak Ciphers</span>
                <span className="text-[11px] font-mono text-[#ff2d55]">{sslTest.weakCiphers.length}</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        {/* Headers Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#5e5ce6">Security Headers</SectionHeader>
          {headers ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Grade</span>
                <span className="text-[11px] font-mono text-[#5e5ce6] font-bold">{headers.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Present</span>
                <span className="text-[11px] font-mono text-[#30d158]">{headersPassed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Missing</span>
                <span className="text-[11px] font-mono text-[#ff2d55]">{headers.missing}</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        {/* Risk Breakdown */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Risk Breakdown</SectionHeader>
          <RiskBar label="Critical Vulnerabilities" score={vulnsCritical} max={5} color="#ff2d55" />
          <RiskBar label="High Vulnerabilities" score={vulnsHigh} max={10} color="#ff6b35" />
          <RiskBar label="Medium/Low" score={(vulnScan?.medium ?? 0) + (vulnScan?.low ?? 0)} max={10} color="#f5a623" />
          <RiskBar label="Overall Risk" score={overallRisk} max={10} color={riskColor} />
        </div>

        {/* Quick Actions */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Quick Actions</SectionHeader>
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#0af] bg-[#0af10] border border-[#0af30] rounded hover:bg-[#0af20] transition-colors">▶ Directory Fuzz</button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] bg-[#ff2d5510] border border-[#ff2d5530] rounded hover:bg-[#ff2d5520] transition-colors">▶ Vuln Scan</button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#30d158] bg-[#30d15810] border border-[#30d15830] rounded hover:bg-[#30d15820] transition-colors">▶ SSL Test</button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#5e5ce6] bg-[#5e5ce610] border border-[#5e5ce630] rounded hover:bg-[#5e5ce620] transition-colors">▶ Headers Check</button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] bg-[#ff2d5510] border border-[#ff2d5530] rounded hover:bg-[#ff2d5520] transition-colors">▶ Run Full Scan</button>
          </div>
        </div>
      </div>
    </div>
  );
}