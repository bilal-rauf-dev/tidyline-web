import { useEffect, useState } from 'react'

const RECHECK_MS = 60000
const MODULE_START = Date.now()

export function useTimeTick(intervalMs = RECHECK_MS) {
  const [tick, setTick] = useState(MODULE_START)

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), intervalMs)

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') setTick(Date.now())
    }

    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [intervalMs])

  return tick
}
