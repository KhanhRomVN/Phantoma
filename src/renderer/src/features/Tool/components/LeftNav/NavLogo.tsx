export function NavLogo() {
  return (
    <div className="w-9 h-9 rounded-lg border border-[#0099cc] bg-cyan-500/5 flex items-center justify-center mb-2 cursor-pointer shrink-0" title="PHANTOM v2.5.0">
      <svg className="w-[18px] h-[18px] text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L3 7v10l9 5 9-5V7z"/>
        <path d="M12 12L3 7M12 12v10M12 12l9-5"/>
      </svg>
    </div>
  )
}
