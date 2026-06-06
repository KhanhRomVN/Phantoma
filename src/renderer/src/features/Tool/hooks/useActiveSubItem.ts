import { useState } from 'react'

export function useActiveSubItem(initial: string | null = null) {
  const [activeSubItem, setActiveSubItem] = useState<string | null>(initial)
  return { activeSubItem, setActiveSubItem }
}