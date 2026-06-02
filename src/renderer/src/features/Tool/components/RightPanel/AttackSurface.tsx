import { KVRow } from '../ui/KVRow'

export function AttackSurface() {
  return (
    <div className="mb-4">
      <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Attack Surface</div>
      <KVRow label="Exposed services" value="Telnet, FTP (plaintext)" valueColor="text-red-400" />
      <KVRow label="Auth endpoints"   value="3 (brute-forceable)"    valueColor="text-amber-400" />
      <KVRow label="Unpatched CVEs"   value="MS17-010, Log4Shell"    valueColor="text-red-400" />
      <KVRow label="API endpoints"    value="24 discovered" />
    </div>
  )
}
