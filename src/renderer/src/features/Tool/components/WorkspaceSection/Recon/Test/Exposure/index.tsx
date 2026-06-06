import {
  RISK_COLOR,
  SectionHeader,
  RiskPill,
} from '../../shared-ui';
import type { ReconData } from '../ReconDataContext';

export function TabExposure({ data }: { data: ReconData }) {
  const { cloudAssets, codeRepos, darkWebLeaks, googleDorks, waybackSnapshots } = data;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Cloud Assets */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Cloud Asset Exposure</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {cloudAssets.map((a, i) => (
              <div
                key={i}
                className="border rounded p-2.5"
                style={{
                  borderColor: `${RISK_COLOR[a.risk]}30`,
                  background: `${RISK_COLOR[a.risk]}06`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[11px] font-bold font-mono"
                    style={{ color: RISK_COLOR[a.risk] }}
                  >
                    {a.type}
                  </span>
                  <RiskPill level={a.risk} />
                </div>
                <div className="text-[10px] font-mono text-[#4a5a7a] mb-1">{a.name}</div>
                <div className="text-[10px] font-bold text-[#ff2d55] font-mono mb-1">{a.perm}</div>
                <div className="space-y-0.5">
                  {a.files.map((f, fi) => (
                    <div
                      key={fi}
                      className="text-[9.5px] font-mono text-[#3a4558] flex items-center gap-1"
                    >
                      <span className="text-[#ff2d55]">›</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Repos */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff6b35">Leaked Secrets in Repos</SectionHeader>
          {codeRepos.map((repo, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-[#0af]">{repo.repo}</span>
                <span className="text-[9px] text-[#3a4558] font-mono">
                  {repo.platform} · {repo.lastCommit}
                </span>
              </div>
              {repo.secrets.map((s, si) => (
                <div
                  key={si}
                  className="text-[10px] font-mono text-[#ff2d55] bg-[#ff2d5508] border border-[#ff2d5520] rounded px-2 py-1 mb-0.5 truncate"
                >
                  {s}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Dark Web */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Dark Web & Paste Leaks</SectionHeader>
          {darkWebLeaks.map((l, i) => (
            <div
              key={i}
              className="mb-2 last:mb-0 border rounded p-2"
              style={{
                borderColor: `${RISK_COLOR[l.risk]}25`,
                background: `${RISK_COLOR[l.risk]}05`,
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className="text-[11px] font-mono font-bold"
                  style={{ color: RISK_COLOR[l.risk] }}
                >
                  {l.source}
                </span>
                <span className="text-[9px] text-[#2a3548] font-mono">{l.date}</span>
              </div>
              <div className="text-[10px] text-[#6a7a9a] leading-relaxed">{l.snippet}</div>
            </div>
          ))}
        </div>

        {/* Google Dorks */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Google Dork Results</SectionHeader>
          <div className="grid grid-cols-3 gap-2">
            {googleDorks.map((d, i) => (
              <div key={i} className="bg-[#060810] border border-[#1c2333] rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#f5a623]">{d.type}</span>
                  <span className="text-[10px] font-mono text-[#f5a623] bg-[#f5a62315] px-1 rounded">
                    {d.results} hits
                  </span>
                </div>
                <div className="text-[9px] font-mono text-[#2a3548] break-all mb-1">{d.query}</div>
                {d.urls.map((u, ui) => (
                  <div key={ui} className="text-[9.5px] text-[#0af] truncate">
                    › {u}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Wayback */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Wayback Machine Findings</SectionHeader>
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-[#1c2333]">
                {['Date', 'URL Path', 'Security Finding'].map((h) => (
                  <th
                    key={h}
                    className="text-left p-1.5 text-[#2a3548] text-[10px] uppercase tracking-wider font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waybackSnapshots.map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors"
                >
                  <td className="p-1.5 text-[#3a4558]">{s.date}</td>
                  <td className="p-1.5 text-[#0af]">{s.url}</td>
                  <td className="p-1.5 text-[#8da0c0]">{s.finding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}