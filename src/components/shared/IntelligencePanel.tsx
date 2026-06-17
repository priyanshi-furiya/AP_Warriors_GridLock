import { motion, AnimatePresence } from 'motion/react'
import type { Hotspot } from '@/data/hotspots'
import { getSeverityColor, getSeverityLevel } from '@/data/hotspots'

interface IntelligencePanelProps {
  hotspot: Hotspot | null
  isVisible: boolean
  position?: 'left' | 'right'
}

/* ── Severity badge ── */
function SeverityBadge({ severity }: { severity: number }) {
  const level = getSeverityLevel(severity)
  const color = getSeverityColor(severity)
  const labels: Record<string, string> = {
    critical: 'CRITICAL',
    medium: 'ELEVATED',
    low: 'MODERATE',
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]
                 font-mono font-bold uppercase tracking-wider"
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
        style={{ backgroundColor: color }}
      />
      {labels[level]}
    </span>
  )
}

/* ── Vehicle mix stacked bar ── */
function VehicleMixBar({ mix }: { mix: Hotspot['vehicleMix'] }) {
  const segments = [
    { key: 'cars', value: mix.cars, color: '#3B82F6', label: 'Cars' },
    { key: 'scooters', value: mix.scooters, color: '#A3FF12', label: '2W' },
    { key: 'autos', value: mix.autos, color: '#FBBF24', label: 'Auto' },
    { key: 'trucks', value: mix.trucks, color: '#FF6B35', label: 'Truck' },
    { key: 'buses', value: mix.buses, color: '#8B5CF6', label: 'Bus' },
  ]

  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-graphite">
        {segments.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${seg.value}%`, backgroundColor: seg.color }}
            className="transition-all duration-500"
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-[9px] font-mono text-text-muted">
              {seg.label} {seg.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Sparkline ── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null

  const w = 160
  const h = 32
  const min = Math.min(...data) * 0.95
  const max = Math.max(...data) * 1.05
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  const areaPoints = `0,${h} ${points} ${w},${h}`

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={`${color}15`}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * w}
        cy={h - ((data[data.length - 1] - min) / range) * h}
        r="2.5"
        fill={color}
      />
    </svg>
  )
}

/* ── Main Panel ── */
export default function IntelligencePanel({
  hotspot,
  isVisible,
  position = 'right',
}: IntelligencePanelProps) {
  const slideDir = position === 'right' ? 1 : -1

  return (
    <AnimatePresence>
      {isVisible && hotspot && (
        <motion.div
          key={hotspot.id}
          initial={{ opacity: 0, x: 40 * slideDir, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40 * slideDir, scale: 0.92 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-[340px] rounded-xl overflow-hidden
                     bg-bg-panel backdrop-blur-[24px]
                     border hud-corner"
          style={{
            borderColor: `${getSeverityColor(hotspot.severity)}30`,
          }}
        >
          {/* ── Header ── */}
          <div className="px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-semibold text-platinum tracking-wide">
                  {hotspot.name}
                </h3>
                <p className="text-[10px] font-mono text-text-muted mt-0.5 uppercase tracking-wider">
                  {hotspot.zone}
                </p>
              </div>
              <SeverityBadge severity={hotspot.severity} />
            </div>
          </div>

          {/* ── Body ── */}
          <div className="px-5 py-4 space-y-4">
            {/* Violation Count */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Active Violations
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="text-3xl font-mono font-bold tabular-nums"
                  style={{ color: getSeverityColor(hotspot.severity) }}
                >
                  {hotspot.violationCount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-mono text-text-muted">today</span>
              </div>
            </div>

            {/* Vehicle Mix */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-2">
                Vehicle Mix
              </span>
              <VehicleMixBar mix={hotspot.vehicleMix} />
            </div>

            {/* Peak Window */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Peak Window
              </span>
              <span className="text-xs font-mono text-platinum">
                {hotspot.peakHours}
              </span>
            </div>

            {/* Top Violations */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-2">
                Top Violations
              </span>
              <div className="flex flex-wrap gap-1.5">
                {hotspot.topViolations.map((v) => (
                  <span
                    key={v}
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-mono
                               text-text-secondary bg-[rgba(163,255,18,0.06)]
                               border border-[rgba(163,255,18,0.08)]"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* 7-day Trend */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-2">
                7-Day Trend
              </span>
              <Sparkline
                data={hotspot.trend}
                color={getSeverityColor(hotspot.severity)}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
