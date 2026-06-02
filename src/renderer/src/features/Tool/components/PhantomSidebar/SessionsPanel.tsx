export function SessionsPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-zinc-600 text-[11px] gap-2">
      <svg className="w-6 h-6" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="2" y="4" width="12" height="9" rx="1.5"/>
        <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
      </svg>
      No active sessions
    </div>
  )
}
