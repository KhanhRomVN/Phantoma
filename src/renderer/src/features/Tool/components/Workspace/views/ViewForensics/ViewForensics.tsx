import { ToolbarButton } from '../../../ui/ToolbarButton'
import { HexViewer } from './HexViewer'
import { ForensicsAnalysis } from './ForensicsAnalysis'

export function ViewForensics() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <ToolbarButton variant="cyan">Open File</ToolbarButton>
        <ToolbarButton>Memory Dump</ToolbarButton>
        <ToolbarButton>Strings Extract</ToolbarButton>
        <ToolbarButton>PCAP Analyze</ToolbarButton>
        <ToolbarButton>Entropy Scan</ToolbarButton>
        <span className="ml-3 text-[10px] text-zinc-500 font-mono truncate">
          malware_sample.bin — 48,320 bytes — MD5: a1b2c3d4e5f6…
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        <HexViewer />
        <ForensicsAnalysis />
      </div>
    </div>
  )
}
