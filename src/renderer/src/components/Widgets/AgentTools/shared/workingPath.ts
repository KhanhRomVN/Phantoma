const STORAGE_KEY = 'agent-tools:working-path'

let workingPath = ''
try {
  workingPath = localStorage.getItem(STORAGE_KEY) ?? ''
} catch {
  workingPath = ''
}

export const getWorkingPath = (): string => workingPath

export const setWorkingPath = (path: string): void => {
  workingPath = path.replace(/\/+$/, '')
  try {
    localStorage.setItem(STORAGE_KEY, workingPath)
  } catch {
    // ASSUMED: localStorage không khả dụng thì chỉ giữ giá trị trong bộ nhớ
  }
}

export const toRelativePath = (path: string): string => {
  if (!workingPath) return path
  if (path === workingPath) return '/'
  return path.startsWith(workingPath + '/') ? path.slice(workingPath.length) : path
}