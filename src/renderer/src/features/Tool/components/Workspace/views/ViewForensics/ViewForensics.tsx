import { ToolbarButton } from '../../../ui/ToolbarButton'
import { HexViewer } from './HexViewer'
import { ForensicsAnalysis } from './ForensicsAnalysis'

export function ViewForensics() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <ToolbarButton variant="cyan">Open File</ToolbarButton>
        <ToolbarButton>Memory Dump</ToolbarButton>
        <ToolbarButton>Strings Extract</ToolbarButton>
        <ToolbarButton>PCAP Analyze</ToolbarButton>
        <ToolbarButton>Entropy Scan</ToolbarButton>
        <span className="ml-3 text-[10px] text-[#6b7a96] font-mono truncate">
          malware_sample.bin — 48,320 bytes — MD5: a1b2c3d4e5f6…
        </span>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        <HexViewer />
        <ForensicsAnalysis />
      </div>
    </div>
  )
}
