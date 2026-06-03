import { KVRow } from '../../../ui/KVRow'

const SectionTitle = ({children}:{children:React.ReactNode}) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">{children}</div>
)

export function ForensicsAnalysis() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'35%'}}>
      <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Analysis</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <SectionTitle>File Info</SectionTitle>
          <KVRow label="Type"     value="PE32+ Executable"        valueColor="text-cyan-400" />
          <KVRow label="Entropy"  value="7.94 (packed/encrypted)" valueColor="text-red-400" />
          <KVRow label="Packer"   value="UPX 3.96 detected"       valueColor="text-amber-400" />
          <KVRow label="Compiler" value="MSVC 19.35" />
          <KVRow label="Signed"   value="NO"                      valueColor="text-red-400" />
        </div>
        <div>
          <SectionTitle>IOCs Extracted</SectionTitle>
          <KVRow label="C2 URL"      value="http://c2.evil.com/beacon"   valueColor="text-red-400" />
          <KVRow label="Registry"    value="HKCU\\Software\\Run"         valueColor="text-amber-400" />
          <KVRow label="Mutex"       value="Global\\MalwareMutex2024" />
          <KVRow label="Dropped file" value="%TEMP%\\svchost32.exe"      valueColor="text-red-400" />
        </div>
        <div>
          <SectionTitle>Critical Strings</SectionTitle>
          <div className="bg-[#080a0e] border border-[#1e2535] rounded p-2 font-mono text-[10px] leading-7 space-y-0">
            <div className="text-green-400">http://c2.evil.com/beacon</div>
            <div className="text-red-400">cmd.exe /c whoami</div>
            <div className="text-amber-400">regsvr32.exe</div>
            <div className="text-[#c5cfe0]">CreateRemoteThread</div>
            <div className="text-[#c5cfe0]">VirtualAllocEx</div>
            <div className="text-purple-400">WriteProcessMemory</div>
          </div>
        </div>
      </div>
    </div>
  )
}
