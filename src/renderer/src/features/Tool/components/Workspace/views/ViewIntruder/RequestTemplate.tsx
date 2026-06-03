import { KVRow } from '../../../ui/KVRow'

export function RequestTemplate() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden" style={{ width: '45%' }}>
      <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Request Template</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="bg-[#080a0e] border border-[#1e2535] rounded p-2.5 font-mono text-[10.5px] leading-7">
          <span className="text-cyan-400">POST</span>{' '}
          <span className="text-[#c5cfe0]">/api/v1/login</span>{' '}
          <span className="text-[#6b7a96]">HTTP/1.1</span><br/>
          <span className="text-[#6b7a96]">Host: </span><span className="text-[#c5cfe0]">target.corp.local</span><br/>
          <span className="text-[#6b7a96]">Content-Type: </span><span className="text-[#c5cfe0]">application/json</span><br/>
          <span className="text-[#6b7a96]">Authorization: </span><span className="text-amber-400">Bearer eyJhbGci…</span><br/>
          <br/>
          <span className="text-[#6b7a96]">{'{'}</span><br/>
          {'  '}<span className="text-cyan-400">"username"</span>:{' '}
          <span className="bg-red-500/12 border border-dashed border-red-500/30 text-red-400 px-1 rounded">§admin§</span>,<br/>
          {'  '}<span className="text-cyan-400">"password"</span>:{' '}
          <span className="bg-red-500/12 border border-dashed border-red-500/30 text-red-400 px-1 rounded">§password§</span><br/>
          <span className="text-[#6b7a96]">{'}'}</span>
        </div>
        <div>
          <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">Payload Sets</div>
          <KVRow label="Position 1 (username)" value="usernames.txt (847 entries)" valueColor="text-cyan-400" />
          <KVRow label="Position 2 (password)" value="top-500-passwords.txt"       valueColor="text-cyan-400" />
          <KVRow label="Combinations"          value="423,500" />
          <KVRow label="Throttle"              value="50 req/s (adaptive)"         valueColor="text-green-400" />
        </div>
      </div>
    </div>
  )
}
