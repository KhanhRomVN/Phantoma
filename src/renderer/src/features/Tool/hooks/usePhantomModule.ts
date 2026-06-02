import { useState } from 'react'
import { PhantomModule } from '../types/phantom'

export function usePhantomModule(initial: PhantomModule = 'recon') {
  const [activeModule, setActiveModule] = useState<PhantomModule>(initial)
  return { activeModule, setActiveModule }
}
