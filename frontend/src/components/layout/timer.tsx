import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type RunningTimer = { projectId: string; projectName: string; description: string; startedAt: number }
type TimerState = {
  running: RunningTimer | null
  elapsed: number
  start: (timer: Omit<RunningTimer, 'startedAt'>) => void
  stop: () => RunningTimer & { seconds: number } | null
}

const TimerContext = createContext<TimerState | null>(null)

/** One active timer per user (spec 3.7). Local until the time-tracking API exists. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState<RunningTimer | null>({
    projectId: 'pr_1', projectName: 'Fleet tracking dashboard', description: 'Live map clustering', startedAt: Date.now() - 47 * 60_000,
  })
  const [nowTick, setNowTick] = useState(Date.now())

  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [running])

  const value = useMemo<TimerState>(() => ({
    running,
    elapsed: running ? Math.max(0, Math.floor((nowTick - running.startedAt) / 1000)) : 0,
    start: (timer) => { setRunning({ ...timer, startedAt: Date.now() }); setNowTick(Date.now()) },
    stop: () => {
      if (!running) return null
      const result = { ...running, seconds: Math.floor((Date.now() - running.startedAt) / 1000) }
      setRunning(null)
      return result
    },
  }), [running, nowTick])

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) throw new Error('useTimer must be used inside TimerProvider')
  return context
}

export function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((part) => part.toString().padStart(2, '0')).join(':')
}
