import { KVRow } from '../../../ui/KVRow'

export function ForensicsAnalysis() {
  return (
    <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '35%' }}>
      <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">Analysis</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">File Info</div>
          <KVRow label="Type"     value="PE32+ Executable"         valueColor="text-cyan-400" />
          <KVRow label="Entropy"  value="7.94 (packed/encrypted)"  valueColor="text-red-400" />
          <KVRow label="Packer"   value="UPX 3.96 detected"        valueColor="text-amber-400" />
          <KVRow label="Compiler" value="MSVC 19.35" />
          <KVRow label="Signed"   value="NO"                       valueColor="text-red-400" />
        </div>

        <div>
          <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">IOCs Extracted</div>
          <KVRow label="C2 URL"      value="http://c2.evil.com/beacon" valueColor="text-red-400" />
          <KVRow label="Registry"    value="HKCU\\Software\\Run"       valueColor="text-amber-400" />
          <KVRow label="Mutex"       value="Global\\MalwareMutex2024" />
          <KVRow label="Dropped file" value="%TEMP%\\svchost32.exe"   valueColor="text-red-400" />
        </div>

        <div>
          <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Critical Strings</div>
          <div className="bg-zinc-950 border border-zinc-800 rounded p-2 font-mono text-[10px] leading-7 space-y-0">
            <div className="text-green-400">http://c2.evil.com/beacon</div>
            <div className="text-red-400">cmd.exe /c whoami</div>
            <div className="text-amber-400">regsvr32.exe</div>
            <div className="text-zinc-300">CreateRemoteThread</div>
            <div className="text-zinc-300">VirtualAllocEx</div>
            <div className="text-purple-400">WriteProcessMemory</div>
          </div>
        </div>
      </div>
    </div>
  )
}
