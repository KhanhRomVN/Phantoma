import { ActionButton } from '../ui/ActionButton'

const ACTIONS = [
  { label: 'Start Full Exploitation', variant: 'red'    },
  { label: 'Run Post-Exploitation',   variant: 'green'  },
  { label: 'Generate Full Report',    variant: 'cyan'   },
  { label: 'Export to Metasploit',    variant: 'purple' },
] as const

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
)

export function ActionButtons() {
  return (
    <div>
      <SectionTitle>Actions</SectionTitle>
      {ACTIONS.map((a) => (
        <ActionButton key={a.label} variant={a.variant}>
          <span className="opacity-40 text-xs">›</span>
          {a.label}
        </ActionButton>
      ))}
    </div>
  )
}
