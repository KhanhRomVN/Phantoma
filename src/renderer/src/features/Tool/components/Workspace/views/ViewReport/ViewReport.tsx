import { useState } from 'react'
import { cn } from '../../../../../../shared/lib/utils'
import { ToolbarButton } from '../../../ui/ToolbarButton'

const SECTIONS = [
  { id:'1', label:'1. Executive Summary',   on:true  },
  { id:'2', label:'2. Scope & Methodology', on:true  },
  { id:'3', label:'3. Risk Summary',        on:true  },
  { id:'4', label:'4. Technical Findings',  on:true  },
  { id:'5', label:'5. Evidence & PoC',      on:true  },
  { id:'6', label:'6. Remediation Steps',   on:true  },
  { id:'7', label:'7. Appendix / Raw Data', on:false },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className={cn('w-7 h-3.5 rounded-full relative cursor-pointer transition-colors shrink-0', on ? 'bg-green-500' : 'bg-[#252e42]')}>
      <div className={cn('w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all', on ? 'left-4' : 'left-0.5')} />
    </div>
  )
}
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />

export function ViewReport() {
  const [sections, setSections] = useState(SECTIONS)
  const toggle = (id: string) => setSections(s => s.map(sec => sec.id === id ? {...sec, on: !sec.on} : sec))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <ToolbarButton variant="cyan">▶ Build Report</ToolbarButton>
        <ToolbarButton variant="green">Export PDF</ToolbarButton>
        <ToolbarButton>Export DOCX</ToolbarButton>
        <TbSep />
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">Template:</span>
        <select className="h-6 bg-[#111520] border border-[#252e42] rounded text-[#c5cfe0] text-[11px] px-2 outline-none">
          <option>Pentest Standard</option>
          <option>Executive Summary</option>
          <option>Bug Bounty</option>
        </select>
        <ToolbarButton variant="amber" className="ml-auto">Auto-Fill from Findings ▾</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        {/* Sections */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'28%'}}>
          <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Report Sections</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-[#111520] border border-[#1e2535] rounded px-2.5 py-2 hover:border-[#252e42] transition-all cursor-move">
                <span className="text-[#3d4a61] text-sm">⠿</span>
                <span className="flex-1 text-[11px] text-[#c5cfe0]">{s.label}</span>
                <Toggle on={s.on} onToggle={() => toggle(s.id)} />
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-[#1e2535]">
              <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.08em] mb-2">Branding</div>
              <div className="text-[10.5px] space-y-1">
                <div className="flex gap-2 py-0.5"><span className="text-[#6b7a96] w-24">Client</span><span className="text-cyan-400">Corp, Inc.</span></div>
                <div className="flex gap-2 py-0.5"><span className="text-[#6b7a96] w-24">Author</span><span className="text-[#c5cfe0]">Red Team Alpha</span></div>
                <div className="flex gap-2 py-0.5"><span className="text-[#6b7a96] w-24">Classification</span><span className="text-red-400">CONFIDENTIAL</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'72%'}}>
          <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Report Preview</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#080a0e]">
            <div className="max-w-2xl mx-auto bg-[#111520] border border-[#1e2535] rounded-lg p-6">
              <div className="border-b-2 border-red-500 pb-4 mb-5">
                <div className="text-[22px] font-bold text-[#c5cfe0] tracking-wide uppercase">PENETRATION TEST REPORT</div>
                <div className="text-[11px] text-[#6b7a96] mt-1">Corp, Inc. — Internal Infrastructure Assessment</div>
                <div className="text-[10px] text-[#3d4a61] mt-0.5">Classification: CONFIDENTIAL | Date: 2026-06-02 | Author: Red Team Alpha</div>
              </div>
              <div className="mb-5">
                <div className="text-[14px] font-bold text-red-400 mb-2 uppercase tracking-wide">1. Executive Summary</div>
                <p className="text-[11px] text-[#6b7a96] leading-7">
                  Red Team Alpha conducted an internal penetration test of Corp, Inc. infrastructure.{' '}
                  <span className="text-red-400 font-semibold">27 vulnerabilities were identified</span>, including 3 critical-severity issues enabling full network compromise.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                  {n:'3',  label:'Critical', color:'text-red-400',   border:'border-red-500/20',  bg:'bg-red-500/5'},
                  {n:'7',  label:'High',     color:'text-red-400',   border:'border-[#252e42]',   bg:'bg-[#161b26]'},
                  {n:'12', label:'Medium',   color:'text-amber-400', border:'border-[#252e42]',   bg:'bg-[#161b26]'},
                  {n:'5',  label:'Low',      color:'text-cyan-400',  border:'border-[#252e42]',   bg:'bg-[#161b26]'},
                ].map((s) => (
                  <div key={s.label} className={cn('border rounded p-2 text-center', s.border, s.bg)}>
                    <div className={cn('text-[18px] font-bold', s.color)}>{s.n}</div>
                    <div className="text-[9px] text-[#6b7a96]">{s.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[14px] font-bold text-red-400 mb-3 uppercase tracking-wide">4. Technical Findings (Top 2)</div>
                {[
                  {sev:'CRITICAL', name:'Log4Shell — CVE-2021-44228', cvss:'10.0', cvssColor:'text-purple-400', desc:'Unauthenticated RCE via JNDI injection on 192.168.1.20:8080.', border:'border-purple-500/20'},
                  {sev:'CRITICAL', name:'EternalBlue — MS17-010',     cvss:'9.8',  cvssColor:'text-red-400',    desc:'SMBv1 RCE on Domain Controller 192.168.1.10. SYSTEM shell obtained.', border:'border-red-500/20'},
                ].map((f) => (
                  <div key={f.name} className={cn('bg-[#161b26] border rounded p-3 mb-2', f.border)}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9.5px] font-bold px-1.5 py-0 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">{f.sev}</span>
                      <span className="text-[12px] font-semibold text-[#c5cfe0] flex-1">{f.name}</span>
                      <span className={cn('text-[10px] font-bold', f.cvssColor)}>CVSS {f.cvss}</span>
                    </div>
                    <p className="text-[10.5px] text-[#6b7a96]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
