import {
  threatIntel,
  socialIntel,
  certTransparency,
  httpHeaders,
  whoisData,
  SectionHeader,
  KV,
} from '../shared';

export function TabIntel() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Threat Intel */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Threat Intelligence Feeds</SectionHeader>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-[#1c2333]">
                {['Source', 'Indicator', 'Detections', 'Verdict', 'Detail'].map((h) => (
                  <th key={h} className="text-left p-1.5 text-[#2a3548] text-[9px] uppercase tracking-wider font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threatIntel.map((ti, i) => {
                const vc =
                  ti.verdict === 'malicious' ? '#ff2d55'
                  : ti.verdict === 'suspicious' ? '#f5a623'
                  : '#ff6b35';
                return (
                  <tr key={i} className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors">
                    <td className="p-1.5 text-[#0af]">{ti.source}</td>
                    <td className="p-1.5 text-[#8da0c0]">{ti.indicator}</td>
                    <td className="p-1.5 font-bold" style={{ color: vc }}>{ti.detections}</td>
                    <td className="p-1.5">
                      <span className="uppercase font-bold text-[9px]" style={{ color: vc }}>{ti.verdict}</span>
                    </td>
                    <td className="p-1.5 text-[#4a5a7a] max-w-xs truncate">{ti.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Social Intel */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Social Intelligence (SOCMINT)</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {socialIntel.map((s, i) => (
              <div key={i} className="bg-[#060810] border border-[#1c2333] rounded p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono" style={{ background: '#bf5af215', color: '#bf5af2', border: '1px solid #bf5af230' }}>
                    {s.platform}
                  </span>
                  <span className="text-[10px] font-semibold text-[#8da0c0]">{s.name}</span>
                </div>
                <div className="text-[9px] text-[#3a4558] font-mono mb-1">{s.role}</div>
                <div className="text-[9px] text-[#6a7a9a] mb-1">{s.intel}</div>
                <div className="text-[8px] text-[#2a3548] font-mono">{s.url}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate Transparency */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Certificate Transparency Log</SectionHeader>
          {certTransparency.map((cert, i) => (
            <div key={i} className="mb-2 last:mb-0 bg-[#060810] border border-[#1c2333] rounded p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold text-[#0af]">{cert.commonName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#2a3548] font-mono">logged {cert.loggedAt}</span>
                  <span className="text-[8px] text-[#2a3548] font-mono">expires {cert.notAfter}</span>
                </div>
              </div>
              <div className="text-[9px] text-[#3a4558] mb-1">{cert.issuer}</div>
              <div className="flex flex-wrap gap-1">
                {cert.san.map((s) => (
                  <span key={s} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#0af10] border border-[#0af20] text-[#0af]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* HTTP Headers */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">HTTP Response Headers</SectionHeader>
          <div className="grid grid-cols-2 gap-x-4">
            {Object.entries(httpHeaders).map(([k, v]) => {
              const good = v.includes('✓'), bad = v.includes('⚠️');
              return (
                <KV key={k} k={k} v={v} vc={good ? 'text-[#30d158]' : bad ? 'text-[#f5a623]' : 'text-[#6a7a9a]'} />
              );
            })}
          </div>
        </div>

        {/* WHOIS */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">WHOIS Registration</SectionHeader>
          <KV k="Domain" v={whoisData.domain} vc="text-[#0af]" />
          <KV k="Status" v={whoisData.status} />
          <KV k="Registrar" v={whoisData.registrar.name} />
          <KV k="Created" v={whoisData.dates.created} />
          <KV k="Updated" v={whoisData.dates.updated} />
          <KV k="Expires" v={whoisData.dates.expired} vc="text-[#f5a623]" />
          <KV k="Registrant" v={whoisData.registrant.name} />
          <KV k="Org" v={whoisData.registrant.organization} />
          <KV k="Location" v={`${whoisData.registrant.city}, ${whoisData.registrant.state}, ${whoisData.registrant.country}`} />
          <KV k="Email" v={whoisData.registrant.email} vc="text-[#ff6b35]" />
          <KV k="Phone" v={whoisData.registrant.phone} />
        </div>

        {/* Robots & Sitemap */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Robots.txt / Sitemap</SectionHeader>
          <div className="mb-3">
            <div className="text-[8.5px] uppercase tracking-wider text-[#2a3548] font-mono mb-1">Disallowed Paths</div>
            {['/admin', '/api/private', '/backup', '/jenkins', '/internal'].map((p) => (
              <div key={p} className="text-[9px] font-mono text-[#ff6b35] flex items-center gap-1 mb-0.5">
                <span className="text-[#ff2d55]">✗</span> {p}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-wider text-[#2a3548] font-mono mb-1">Sitemap URLs</div>
            {['/', 'about', 'contact', 'blog', 'privacy', 'terms', 'admin/login', 'api/docs'].map((p) => (
              <div key={p} className="text-[9px] font-mono text-[#4a5a7a] flex items-center gap-1 mb-0.5">
                <span className="text-[#30d158]">›</span> phantom.tech/{p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
