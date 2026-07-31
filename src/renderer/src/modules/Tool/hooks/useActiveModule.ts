import { useState } from 'react'
import { PhantomModule } from '../types/types'

export function useActiveModule(initial: PhantomModule = 'recon') {
  const [activeModule, setActiveModule] = useState<PhantomModule>(initial)
  return { activeModule, setActiveModule }
}