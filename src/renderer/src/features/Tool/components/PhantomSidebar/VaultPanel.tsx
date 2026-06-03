import { SectionLabel } from '../ui/SectionLabel'

type SourceTag = 'hashdump' | 'phishing' | 'sqli' | 'brute'
type CredStatus = 'valid' | 'unknown'

interface CredEntry {
  id: string
  label: string
  detail: string
  source: SourceTag
  status: CredStatus
}

const CREDS: CredEntry[] = [
  { id: '1', label: 'SYSTEM — Administrator',  detail: 'aad3b435...d7b5e5f4',   source: 'hashdump', status: 'valid'   },
  { id: '2', label: 'alice@corp.local',          detail: 'Spring2024!',           source: 'phishing', status: 'valid'   },
  { id: '3', label: 'admin',                     detail: 'admin123',              source: 'brute',    status: 'valid'   },
  { id: '4', label: 'john.doe@corp.local',       detail: '$2y$10$xyz789...',      source: 'sqli',     status: 'valid'   },
  { id: '5', label: 'ceo@corp.local',            detail: 'Secr3t!Pass',           source: 'phishing', status: 'valid'   },
  { id: '6', label: 'SYSTEM — krbtgt',           detail: 'TGT ticket (kerberos)', source: 'hashdump', status: 'unknown' },
]

const SOURCE_CLASS: Record<SourceTag, string> = {
  hashdump: 'bg-red-500/12 text-red-400 border border-red-500/20',
  phishing: 'bg-amber-500/12 text-amber-400 border border-amber-500/20',
  sqli:     'bg-cyan-500/10 text-cyan-400 border border-cyan-500/18',
  brute:    'bg-green-500/10 text-green-400 border border-green-500/18',
}

const STATUS_BORDER: Record<CredStatus, string> = {
  valid:   'border-l-[3px] border-l-green-500',
  unknown: 'border-l-[3px] border-l-amber-500',
}

const LABEL_COLOR: Record<CredStatus, string> = {
  valid:   'text-green-400',
  unknown: 'text-amber-400',
}

export function VaultPanel() {
  return (
    <>
      <SectionLabel>Credential Vault</SectionLabel>
      {CREDS.map((c) => (
        <div
          key={c.id}
          className={`flex items-center gap-2 bg-[#111520] border border-[#1e2535] rounded px-2.5 py-1.5 mb-1 ${STATUS_BORDER[c.status]}`}
        >
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-semibold truncate ${LABEL_COLOR[c.status]}`}>{c.label}</div>
            <div className="text-[10px] text-[#6b7a96] truncate">{c.detail}</div>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${SOURCE_CLASS[c.source]}`}>
            {c.source}
          </span>
        </div>
      ))}
      <button className="w-full mt-2 px-2.5 py-1.5 rounded border border-[#252e42] bg-[#161b26] text-[10.5px] font-semibold text-[#c5cfe0] flex items-center gap-1.5 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all">
        <span className="opacity-40 text-xs">›</span> Export All Credentials
      </button>
    </>
  )
}
