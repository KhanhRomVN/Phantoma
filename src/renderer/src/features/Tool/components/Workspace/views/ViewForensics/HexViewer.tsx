import { cn } from '../../../../../../shared/lib/utils'

type ByteType = 'str' | 'hl' | 'null' | ''
interface HexByte  { value: string; type: ByteType }
interface HexRowData { offset: string; bytes: HexByte[]; ascii: string; asciiType?: 'str' | 'hl' | '' }

const BYTE_COLOR: Record<ByteType, string> = {
  str:  'text-green-400 font-bold',
  hl:   'text-cyan-400 font-bold',
  null: 'text-[#3d4a61]',
  '':   'text-[#6b7a96]',
}

const HEX_ROWS: HexRowData[] = [
  { offset:'00000000', bytes:[{value:'4D',type:'str'},{value:'5A',type:'str'},{value:'90',type:''},{value:'00',type:''},{value:'03',type:''},{value:'00',type:''},{value:'00',type:''},{value:'00',type:''},{value:'04',type:''},{value:'00',type:''},{value:'00',type:''},{value:'00',type:''},{value:'FF',type:''},{value:'FF',type:''},{value:'B8',type:'hl'},{value:'00',type:'hl'}], ascii:'MZ........', asciiType:'' },
  { offset:'00000030', bytes:[{value:'68',type:'str'},{value:'74',type:'str'},{value:'74',type:'str'},{value:'70',type:'str'},{value:'3A',type:'str'},{value:'2F',type:'str'},{value:'2F',type:'str'},{value:'63',type:'str'},{value:'32',type:'str'},{value:'2E',type:'str'},{value:'65',type:'str'},{value:'76',type:'str'},{value:'69',type:'str'},{value:'6C',type:'str'},{value:'2E',type:'str'},{value:'63',type:'str'}], ascii:'http://c2.evil.c', asciiType:'str' },
  { offset:'00000050', bytes:[{value:'60',type:'hl'},{value:'72',type:'hl'},{value:'65',type:'hl'},{value:'67',type:'hl'},{value:'73',type:'hl'},{value:'76',type:'hl'},{value:'72',type:'hl'},{value:'33',type:'hl'},{value:'32',type:'hl'},{value:'00',type:'null'},{value:'50',type:''},{value:'45',type:''},{value:'00',type:'null'},{value:'00',type:'null'},{value:'64',type:''},{value:'86',type:''}], ascii:'regsvr32..PE..d.', asciiType:'hl' },
]

export function HexViewer() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'65%'}}>
      <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Hex View</span>
        <span className="text-[10px] text-[#6b7a96] font-mono">Offset: 0x00000000</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono">
        {HEX_ROWS.map((row) => (
          <div key={row.offset} className="flex gap-4 text-[10.5px] leading-8">
            <span className="text-[#3d4a61] w-14 shrink-0">{row.offset}</span>
            <div className="flex flex-wrap gap-1 flex-1">
              {row.bytes.map((b, i) => <span key={i} className={BYTE_COLOR[b.type]}>{b.value}</span>)}
            </div>
            <span className={cn('text-[#6b7a96] min-w-[110px] shrink-0', row.asciiType === 'str' && 'text-green-400', row.asciiType === 'hl' && 'text-cyan-400')}>
              {row.ascii}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
