interface ViewStubProps {
  title: string
  description?: string
}

export function ViewStub({ title, description = 'Module under construction' }: ViewStubProps) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-zinc-600">
      <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M12 2L3 7v10l9 5 9-5V7z"/>
        <path d="M12 12L3 7M12 12v10M12 12l9-5"/>
      </svg>
      <div className="text-center">
        <div className="text-[13px] font-semibold text-zinc-500">{title}</div>
        <div className="text-[11px] text-zinc-600 mt-1">{description}</div>
      </div>
    </div>
  )
}
