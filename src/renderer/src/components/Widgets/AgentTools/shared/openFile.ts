import { useCodeStore } from '@renderer/modules/Code/hooks/useCodeStore'
import { getWorkingPath } from './workingPath'

export const openFileInWorkspace = (path: string): void => {
  const workingPath = getWorkingPath()
  const isAbsolute = path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)
  const filePath =
    isAbsolute || !workingPath ? path : `${workingPath}/${path.replace(/^\.\//, '')}`
  const state = useCodeStore.getState()
  const sessionId = state.activeWorkspaceSessionId
  if (!sessionId) return
  state.requestOpenFile(sessionId, filePath, filePath.split(/[\\/]/).pop() || filePath)
}