import { KVRow } from '../../../ui/KVRow'

export function RequestTemplate() {
  return (
    <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '45%' }}>
      <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">Request Template</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Raw request */}
        <div className="bg-zinc-950 border border-zinc-800 rounded p-2.5 font-mono text-[10.5px] leading-7">
          <span className="text-cyan-400">POST</span>{' '}
          <span className="text-zinc-200">/api/v1/login</span>{' '}
          <span className="text-zinc-500">HTTP/1.1</span><br />
          <span className="text-zinc-500">Host: </span><span className="text-zinc-200">target.corp.local</span><br />
          <span className="text-zinc-500">Content-Type: </span><span className="text-zinc-200">application/json</span><br />
          <span className="text-zinc-500">Authorization: </span><span className="text-amber-400">Bearer eyJhbGci…</span><br />
          <br />
          <span className="text-zinc-500">{'{'}</span><br />
          {'  '}<span className="text-cyan-400">"username"</span>:{' '}
          <span className="bg-red-500/12 border border-dashed border-red-500/30 text-red-400 px-1 rounded">
            §admin§
          </span>,<br />
          {'  '}<span className="text-cyan-400">"password"</span>:{' '}
          <span className="bg-red-500/12 border border-dashed border-red-500/30 text-red-400 px-1 rounded">
            §password§
          </span><br />
          <span className="text-zinc-500">{'}'}</span>
        </div>

        {/* Payload sets */}
        <div>
          <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Payload Sets</div>
          <KVRow label="Position 1 (username)" value="usernames.txt (847 entries)"  valueColor="text-cyan-400" />
          <KVRow label="Position 2 (password)" value="top-500-passwords.txt"        valueColor="text-cyan-400" />
          <KVRow label="Combinations"          value="423,500" />
          <KVRow label="Throttle"              value="50 req/s (adaptive)"          valueColor="text-green-400" />
        </div>
      </div>
    </div>
  )
}
