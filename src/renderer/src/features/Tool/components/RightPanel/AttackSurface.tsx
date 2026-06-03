import { KVRow } from '../ui/KVRow'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
)

export function AttackSurface() {
  return (
    <div className="mb-4">
      <SectionTitle>Attack Surface</SectionTitle>
      <KVRow label="Exposed services" value="Telnet, FTP (plaintext)" valueColor="text-red-400" />
      <KVRow label="Auth endpoints"   value="3 (brute-forceable)"    valueColor="text-amber-400" />
      <KVRow label="Unpatched CVEs"   value="MS17-010, Log4Shell"    valueColor="text-red-400" />
      <KVRow label="API endpoints"    value="24 discovered" />
    </div>
  )
}
