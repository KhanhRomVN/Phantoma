export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9.5px] font-bold tracking-widest text-zinc-600 uppercase px-1 pb-1 pt-2 select-none">
      {children}
    </div>
  )
}
