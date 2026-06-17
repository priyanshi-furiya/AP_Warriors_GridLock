import { useState, useEffect } from 'react'
import { useAppStore, type ModuleId } from '@/stores/appStore'

function useClock() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const moduleLabels: Record<ModuleId, string> = {
  landing: 'Landing',
  dashboard: 'Dashboard',
  nlpQuery: 'Ask GridLock',
  map: 'Map View',
  hotspots: 'Hotspot Intelligence',
  incidents: 'Incident Explorer',
  temporal: 'Temporal Analytics',
  zones: 'Zone Deep Dive',
  predictor: 'Congestion Predictor',
  patrols: 'Enforcement Routes',
  reports: 'Report Generator',
}

interface StatusDot {
  label: string
  color: string
  glowColor: string
}

const statusDots: StatusDot[] = [
  {
    label: 'System Online',
    color: 'bg-green',
    glowColor: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
  },
  {
    label: 'AI Active',
    color: 'bg-lime',
    glowColor: 'shadow-[0_0_8px_rgba(163,255,18,0.6)]',
  },
  {
    label: 'Network',
    color: 'bg-green',
    glowColor: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
  },
]

export default function StatusBar() {
  const clock = useClock()
  const activeModule = useAppStore((s) => s.activeModule)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)

  const sidebarWidth = sidebarCollapsed ? 64 : 260

  return (
    <header
      className="fixed top-0 right-0 z-40 h-12 flex items-center px-6
                 bg-bg-glass backdrop-blur-[24px]
                 border-b border-b-[rgba(163,255,18,0.1)]"
      style={{
        left: sidebarWidth,
        transition: 'left 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── Left: Breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-[280px]">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold tracking-wider text-platinum">
            GRIDLOCK
          </span>
          <span className="font-display text-sm font-bold tracking-wider text-lime glow-text-lime">
            AI
          </span>
        </div>
        <span className="text-text-muted/40">/</span>
        <span className="text-sm font-mono tracking-wide text-lime/80">
          {moduleLabels[activeModule]}
        </span>
      </div>

      {/* ── Clock ── */}
      <div className="ml-6 font-mono text-sm text-lime/80 tracking-widest tabular-nums">
        {clock}
      </div>

      {/* ── Center: Status Dots + Data Coverage ── */}
      <div className="flex-1 flex items-center justify-center gap-6">
        {statusDots.map((dot) => (
          <div key={dot.label} className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${dot.color} ${dot.glowColor} animate-pulse-glow`}
            />
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
              {dot.label}
            </span>
          </div>
        ))}

        {/* Data coverage badge */}
        <div className="ml-4 flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-bg-secondary/50">
          <span className="w-1.5 h-1.5 rounded-full bg-lime/50" />
          <span className="text-[10px] font-mono text-text-muted tracking-wider">
            Nov 2023 – Apr 2024 | 292,649 records
          </span>
        </div>
      </div>

      {/* ── Right: Command Center ── */}
      <div className="min-w-[220px] text-right">
        <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted">
          Bengaluru Traffic Command
        </span>
      </div>
    </header>
  )
}
