import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/stores/appStore'
import { hotspots, getSeverityColor, getSeverityLevel } from '@/data/hotspots'
import type { Hotspot } from '@/data/hotspots'

// ─── Types ───────────────────────────────────────────
type TimeRange = '1H' | '6H' | '24H' | '7D'
type SeverityFilter = 'critical' | 'medium' | 'low'

// ─── Severity Bar ────────────────────────────────────
function SeverityBar({ severity }: { severity: number }) {
  const color = getSeverityColor(severity)
  return (
    <div className="relative h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${severity}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full blur-sm"
        style={{ backgroundColor: color, opacity: 0.5 }}
        initial={{ width: 0 }}
        animate={{ width: `${severity}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      />
    </div>
  )
}

// ─── Intelligence Panel ──────────────────────────────
function IntelligencePanel({ hotspot }: { hotspot: Hotspot }) {
  const color = getSeverityColor(hotspot.severity)
  const mix = hotspot.vehicleMix
  const total = mix.cars + mix.scooters + mix.autos + mix.trucks + mix.buses

  const vehicleData = [
    { label: 'Cars', value: mix.cars, color: '#A3FF12' },
    { label: 'Scooters', value: mix.scooters, color: '#FF6B35' },
    { label: 'Autos', value: mix.autos, color: '#FBBF24' },
    { label: 'Trucks', value: mix.trucks, color: '#DC2626' },
    { label: 'Buses', value: mix.buses, color: '#22C55E' },
  ]

  // Build sparkline SVG path
  const trend = hotspot.trend
  const maxT = Math.max(...trend)
  const minT = Math.min(...trend)
  const range = maxT - minT || 1
  const points = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * 200
    const y = 40 - ((v - minT) / range) * 36
    return `${x},${y}`
  })
  const sparklinePath = `M${points.join(' L')}`

  return (
    <motion.div
      className="glass-panel p-5 w-[340px] flex flex-col gap-4"
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-platinum text-base font-semibold tracking-wide">
            {hotspot.name}
          </h3>
          <span className="text-text-secondary text-xs font-mono">{hotspot.zone}</span>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold"
          style={{
            backgroundColor: `${color}20`,
            color: color,
            border: `1px solid ${color}40`,
          }}
        >
          {hotspot.severity}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">Violations</p>
          <p className="font-mono text-lg text-platinum font-semibold">
            {hotspot.violationCount.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">Peak Hours</p>
          <p className="font-mono text-sm text-platinum font-medium">{hotspot.peakHours}</p>
        </div>
      </div>

      {/* Vehicle Mix */}
      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">Vehicle Mix</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {vehicleData.map((v) => (
            <motion.div
              key={v.label}
              className="rounded-sm"
              style={{ backgroundColor: v.color }}
              initial={{ flex: 0 }}
              animate={{ flex: v.value / total }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {vehicleData.map((v) => (
            <span key={v.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: v.color }}
              />
              {v.label} {v.value}%
            </span>
          ))}
        </div>
      </div>

      {/* 7-Day Trend Sparkline */}
      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">7-Day Trend</p>
        <svg viewBox="0 0 200 44" className="w-full h-10">
          <defs>
            <linearGradient id={`spark-grad-${hotspot.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${sparklinePath} L200,44 L0,44 Z`}
            fill={`url(#spark-grad-${hotspot.id})`}
          />
          <path
            d={sparklinePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Top Violations */}
      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">Top Violations</p>
        <div className="flex flex-wrap gap-1.5">
          {hotspot.topViolations.map((v) => (
            <span
              key={v}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium border"
              style={{
                borderColor: `${color}30`,
                backgroundColor: `${color}10`,
                color: color,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Sidebar Item ────────────────────────────────────
function SidebarItem({
  hotspot,
  rank,
  isSelected,
  onSelect,
  index,
}: {
  hotspot: Hotspot
  rank: number
  isSelected: boolean
  onSelect: () => void
  index: number
}) {
  const color = getSeverityColor(hotspot.severity)

  return (
    <motion.button
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors duration-200 group relative
        ${isSelected ? 'bg-white/[0.06]' : 'bg-transparent hover:bg-white/[0.03]'}`}
      style={{
        borderLeft: isSelected ? `2px solid ${color}` : '2px solid transparent',
        boxShadow: isSelected ? `inset 0 0 30px ${color}08, 0 0 15px ${color}06` : 'none',
      }}
      onClick={onSelect}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 4 }}
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        <span
          className="font-mono text-xs font-bold w-6 text-center shrink-0"
          style={{ color: rank <= 3 ? color : '#6B7280' }}
        >
          {String(rank).padStart(2, '0')}
        </span>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-platinum text-xs font-medium truncate pr-2">
              {hotspot.name}
            </span>
            <span
              className="font-mono text-[10px] font-semibold shrink-0"
              style={{ color }}
            >
              {hotspot.violationCount.toLocaleString()}
            </span>
          </div>
          <SeverityBar severity={hotspot.severity} />
        </div>
      </div>
    </motion.button>
  )
}

// ─── Main Component ──────────────────────────────────
export default function HotspotMap() {
  const { selectedHotspotId, setSelectedHotspot } = useAppStore()
  const [timeRange, setTimeRange] = useState<TimeRange>('24H')
  const [severityFilters, setSeverityFilters] = useState<Set<SeverityFilter>>(new Set())

  const timeRanges: TimeRange[] = ['1H', '6H', '24H', '7D']
  const severityOptions: { key: SeverityFilter; label: string; color: string }[] = [
    { key: 'critical', label: 'Critical', color: '#DC2626' },
    { key: 'medium', label: 'Medium', color: '#FBBF24' },
    { key: 'low', label: 'Low', color: '#22C55E' },
  ]

  const toggleSeverity = (s: SeverityFilter) => {
    setSeverityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const filteredHotspots = useMemo(() => {
    if (severityFilters.size === 0) return hotspots
    return hotspots.filter((h) => severityFilters.has(getSeverityLevel(h.severity)))
  }, [severityFilters])

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) || null

  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* ── Top Filter Bar ─────────────────────────── */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="glass-panel px-4 py-2.5 flex items-center gap-4">
          {/* Time Range Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-text-muted text-[10px] uppercase tracking-widest mr-2">
              Range
            </span>
            {timeRanges.map((t) => (
              <button
                key={t}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all duration-200
                  ${timeRange === t
                    ? 'bg-lime/15 text-lime border border-lime/25'
                    : 'text-text-secondary hover:text-platinum hover:bg-white/5 border border-transparent'
                  }`}
                onClick={() => setTimeRange(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10" />

          {/* Severity Filter Chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-[10px] uppercase tracking-widest mr-1">
              Severity
            </span>
            {severityOptions.map((s) => {
              const active = severityFilters.has(s.key)
              return (
                <button
                  key={s.key}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 border"
                  style={{
                    backgroundColor: active ? `${s.color}20` : 'transparent',
                    borderColor: active ? `${s.color}50` : 'rgba(255,255,255,0.08)',
                    color: active ? s.color : '#6B7280',
                  }}
                  onClick={() => toggleSeverity(s.key)}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Left Sidebar ───────────────────────────── */}
      <motion.div
        className="absolute top-16 left-4 bottom-16 w-[320px] pointer-events-auto flex flex-col"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="glass-panel flex-1 flex flex-col overflow-hidden">
          {/* Sidebar Header */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-platinum tracking-wide uppercase">
                Hotspot Rankings
              </h2>
              <span className="font-mono text-[10px] text-lime bg-lime/10 px-2 py-0.5 rounded-full">
                {filteredHotspots.length} active
              </span>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar">
            {filteredHotspots.map((hotspot, i) => (
              <SidebarItem
                key={hotspot.id}
                hotspot={hotspot}
                rank={i + 1}
                isSelected={selectedHotspotId === hotspot.id}
                onSelect={() =>
                  setSelectedHotspot(selectedHotspotId === hotspot.id ? null : hotspot.id)
                }
                index={i}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Right Intelligence Panel ───────────────── */}
      <AnimatePresence mode="wait">
        {selectedHotspot && (
          <div className="absolute top-16 right-4 pointer-events-auto">
            <IntelligencePanel key={selectedHotspot.id} hotspot={selectedHotspot} />
          </div>
        )}
      </AnimatePresence>

      {/* ── Bottom Legend ──────────────────────────── */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="glass-panel px-5 py-2 flex items-center gap-5">
          <span className="text-text-muted text-[10px] uppercase tracking-widest">
            Severity
          </span>
          {[
            { label: 'Critical (80+)', color: '#DC2626' },
            { label: 'Medium (60–79)', color: '#FBBF24' },
            { label: 'Low (<60)', color: '#22C55E' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 8px ${item.color}60`,
                }}
              />
              <span className="text-text-secondary text-[11px]">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
