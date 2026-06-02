import { useState, useEffect } from 'react'

export function useLiveClock(): string {
  const [now, setNow] = useState(() => new Date().toISOString().replace('T', ' ').slice(0, 19))
  useEffect(() => {
    const t = setInterval(() => setNow(new Date().toISOString().replace('T', ' ').slice(0, 19)), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}
