import { useState } from 'react'
import type { PhantomTarget, SubTarget } from '../types/types'
import { mockTargetGroups } from '../data/mockData'

export function useActiveTarget() {
  const [targets]               = useState<PhantomTarget[]>(mockTargetGroups)
  const [activeTargetId, setActiveTargetId] = useState<string>(mockTargetGroups[0].id)
  const [activeSubTargetId, setActiveSubTargetId] = useState<string>(
    mockTargetGroups[0].subTargets[0].id
  )

  const activeTarget: PhantomTarget =
    targets.find((t) => t.id === activeTargetId) ?? targets[0]

  const activeSubTarget: SubTarget =
    activeTarget.subTargets.find((s) => s.id === activeSubTargetId) ??
    activeTarget.subTargets[0]

  function switchTarget(targetId: string) {
    const t = targets.find((t) => t.id === targetId)
    if (!t) return
    setActiveTargetId(targetId)
    setActiveSubTargetId(t.subTargets[0].id)
  }

  function switchSubTarget(subTargetId: string) {
    setActiveSubTargetId(subTargetId)
  }

  return {
    targets,
    activeTarget,
    activeSubTarget,
    switchTarget,
    switchSubTarget,
  }
}
