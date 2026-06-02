import { ActionButton } from '../ui/ActionButton'

const ACTIONS = [
  { label: 'Start Full Exploitation', variant: 'red'    },
  { label: 'Run Post-Exploitation',   variant: 'green'  },
  { label: 'Generate Full Report',    variant: 'cyan'   },
  { label: 'Export to Metasploit',    variant: 'purple' },
] as const

export function ActionButtons() {
  return (
    <div>
      <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Actions</div>
      {ACTIONS.map((a) => (
        <ActionButton key={a.label} variant={a.variant}>
          <span className="opacity-40 text-xs">›</span>
          {a.label}
        </ActionButton>
      ))}
    </div>
  )
}
