import { useState, useMemo } from 'react'
import useLiveFeed from '@/hooks/useLiveFeed'
import { useAppStore } from '@/stores/appStore'
import { motion, AnimatePresence } from 'motion/react'
import { getSeverityColor } from '@/data/hotspots'
import type { Hotspot } from '@/data/hotspots'
import { useDataStore } from '@/stores/dataStore'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts'

// ─── Severity Bar Component ─────────────────────────
function SeverityBar({ severity, compact = false }: { severity: number; compact?: boolean }) {
  const color = getSeverityColor(severity)
  return (
    <div
      className={`relative w-full rounded-full bg-white/5 overflow-hidden ${compact ? 'h-1' : 'h-1.5'}`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${severity}%` }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full blur-sm opacity-50"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${severity}%` }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      />
    </div>
  )
}

// ─── Vehicle Mix Bar ─────────────────────────────────
function VehicleMixBar({ mix }: { mix: Hotspot['vehicleMix'] }) {
  const segments = [
    { key: 'Cars', value: mix.cars, color: '#A3FF12' },
    { key: 'Scooters', value: mix.scooters, color: '#FF6B35' },
    { key: 'Autos', value: mix.autos, color: '#FBBF24' },
    { key: 'Trucks', value: mix.trucks, color: '#DC2626' },
    { key: 'Buses', value: mix.buses, color: '#22C55E' },
  ]
  const total = segments.reduce((a, s) => a + s.value, 0)

  return (
    <div>
      <div className="flex h-4 rounded-md overflow-hidden gap-[1px]">
        {segments.map((s) => (
          <motion.div
            key={s.key}
            className="relative group rounded-sm cursor-default"
            style={{ backgroundColor: s.color }}
            initial={{ flex: 0 }}
            animate={{ flex: s.value / total }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {s.value >= 10 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-black/70">
                {s.value}%
              </span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.key}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Peak Window Visual ──────────────────────────────
function PeakWindowDisplay({ peakWindow, peakHours }: { peakWindow: [number, number]; peakHours: string }) {
  const [start, end] = peakWindow
  // 24-hour scale
  return (
    <div>
      <div className="relative h-5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${(start / 24) * 100}%`,
            backgroundColor: '#FF6B35',
            opacity: 0.5,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${((end - start) / 24) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${(start / 24) * 100}%`,
            background: 'linear-gradient(90deg, #FF6B3500, #FF6B35, #FF6B3500)',
            opacity: 0.8,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${((end - start) / 24) * 100}%` }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Hour markers */}
        {[0, 6, 12, 18].map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-text-muted">00:00</span>
        <span className="text-[10px] font-mono text-orange font-medium">{peakHours}</span>
        <span className="text-[9px] font-mono text-text-muted">24:00</span>
      </div>
    </div>
  )
}

// ─── Mini Trend Chart ────────────────────────────────
function TrendChart({ trend, color }: { trend: number[]; color: string }) {
  const data = trend.map((value, i) => ({ day: `D${i + 1}`, value }))

  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill="url(#trendFill)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Row Severity Background ─────────────────────────
function getSeverityRowBg(severity: number): string {
  if (severity >= 90) return 'rgba(220, 38, 38, 0.06)'
  if (severity >= 60) return 'rgba(251, 191, 36, 0.04)'
  return 'rgba(34, 197, 94, 0.03)'
}

function getSeverityBorder(severity: number): string {
  if (severity >= 90) return 'rgba(220, 38, 38, 0.12)'
  if (severity >= 60) return 'rgba(251, 191, 36, 0.08)'
  return 'rgba(34, 197, 94, 0.06)'
}

// ─── Expanded Detail Panel ───────────────────────────
function ExpandedDetail({ hotspot }: { hotspot: Hotspot }) {
  const color = getSeverityColor(hotspot.severity)

  return (
    <motion.div
      className="px-4 pb-4 pt-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <div className="grid grid-cols-2 gap-3">
        {/* Vehicle Mix */}
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[9px] uppercase tracking-[0.15em] mb-2 font-medium">
            Vehicle Mix
          </p>
          <VehicleMixBar mix={hotspot.vehicleMix} />
        </div>

        {/* Peak Window */}
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[9px] uppercase tracking-[0.15em] mb-2 font-medium">
            Peak Window
          </p>
          <PeakWindowDisplay peakWindow={hotspot.peakWindow} peakHours={hotspot.peakHours} />
        </div>

        {/* 7-Day Trend */}
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[9px] uppercase tracking-[0.15em] mb-2 font-medium">
            7-Day Trend
          </p>
          <TrendChart trend={hotspot.trend} color={color} />
        </div>

        {/* Top Violations */}
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[9px] uppercase tracking-[0.15em] mb-2 font-medium">
            Top Violations
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {hotspot.topViolations.map((v) => (
              <span
                key={v}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
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
      </div>
    </motion.div>
  )
}

// ─── Ranking Row ─────────────────────────────────────
function RankingRow({
  hotspot,
  rank,
  isExpanded,
  onToggle,
  index,
}: {
  hotspot: Hotspot
  rank: number
  isExpanded: boolean
  onToggle: () => void
  index: number
}) {
  const color = getSeverityColor(hotspot.severity)
  const bgColor = getSeverityRowBg(hotspot.severity)
  const borderColor = getSeverityBorder(hotspot.severity)

  return (
    <motion.div
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{
        backgroundColor: isExpanded ? bgColor : 'transparent',
        border: `1px solid ${isExpanded ? borderColor : 'transparent'}`,
      }}
      layout
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.4, delay: index * 0.03 },
        x: { duration: 0.4, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] },
      }}
      onClick={onToggle}
      whileHover={{
        backgroundColor: bgColor,
        transition: { duration: 0.15 },
      }}
    >
      {/* Row Content */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Rank Number */}
        <span
          className="font-mono text-base font-bold w-7 text-center shrink-0 tabular-nums"
          style={{ color: rank <= 5 ? color : '#4B5563' }}
        >
          {String(rank).padStart(2, '0')}
        </span>

        {/* Name & Zone */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-platinum text-sm font-medium truncate">
              {hotspot.name}
            </span>
            <span className="text-text-muted text-[10px] font-mono shrink-0">
              {hotspot.zone}
            </span>
          </div>
        </div>

        {/* Severity Bar */}
        <div className="w-28 shrink-0">
          <SeverityBar severity={hotspot.severity} compact />
        </div>

        {/* Score */}
        <div
          className="font-mono text-sm font-bold w-10 text-right shrink-0"
          style={{ color }}
        >
          {hotspot.severity}
        </div>

        {/* Expand indicator */}
        <motion.span
          className="text-text-muted text-xs shrink-0"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          ▾
        </motion.span>
      </div>

      {/* Expandable Detail */}
      <AnimatePresence>
        {isExpanded && <ExpandedDetail hotspot={hotspot} />}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────
export default function HotspotIntelligence() {
  const hotspots = useDataStore((s) => s.hotspots)
  const demoMode = useAppStore((s) => (s as any).demoMode)
  const feed = useLiveFeed()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return hotspots
    const q = searchQuery.toLowerCase()
    return hotspots.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.zone.toLowerCase().includes(q) ||
        h.topViolations.some((v) => v.toLowerCase().includes(q))
    )
  }, [searchQuery, hotspots])

  return (
    <motion.div
      className="w-full h-[calc(100vh-3rem)] p-4 overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="glass-panel h-full flex flex-col overflow-hidden rounded-2xl">
        {/* ── Header ─────────────────────────────── */}
        <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-base font-bold text-platinum uppercase tracking-[0.15em]">
                Hotspot Intelligence
              </h2>
              <span className="font-mono text-[10px] text-lime bg-lime/10 px-2.5 py-0.5 rounded-full border border-lime/20">
                {hotspots.length} total
              </span>
            </div>

            {/* Header Right Badges */}
            <div className="flex items-center gap-2">
              {[
                { label: 'Critical', count: hotspots.filter((h) => h.severity >= 80).length, color: '#DC2626' },
                { label: 'Medium', count: hotspots.filter((h) => h.severity >= 60 && h.severity < 80).length, color: '#FBBF24' },
                { label: 'Low', count: hotspots.filter((h) => h.severity < 60).length, color: '#22C55E' },
              ].map((b) => (
                <span
                  key={b.label}
                  className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${b.color}15`,
                    color: b.color,
                    border: `1px solid ${b.color}25`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: b.color,
                      boxShadow: `0 0 4px ${b.color}80`,
                    }}
                  />
                  {b.count}
                </span>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search hotspots, zones, violations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 pl-8 py-2 text-xs text-platinum placeholder-text-muted focus:outline-none focus:border-lime/20 transition-colors"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs hover:text-platinum transition-colors"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
          {demoMode && (
            <div className="ml-3 text-xs font-mono text-text-muted">
              Live events: <span className="font-bold text-lime">{feed.currentEvents.length}</span>
            </div>
          )}
        </div>

        {/* ── Column Headers ─────────────────────── */}
        <div className="flex items-center gap-4 px-9 py-2 border-b border-white/[0.04] text-[9px] text-text-muted uppercase tracking-[0.15em] shrink-0">
          <span className="w-7 text-center shrink-0">#</span>
          <span className="flex-1">Location</span>
          <span className="w-28 shrink-0">Severity</span>
          <span className="w-10 text-right shrink-0">Score</span>
          <span className="w-4 shrink-0" />
        </div>

        {/* ── Scrollable Rankings ─────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-text-muted">
              <span className="text-2xl mb-2 opacity-40">⌕</span>
              <span className="text-xs">No hotspots match your search</span>
            </div>
          ) : (
            filtered.map((hotspot, i) => (
              <RankingRow
                key={hotspot.id}
                hotspot={hotspot}
                rank={i + 1}
                isExpanded={expandedId === hotspot.id}
                onToggle={() =>
                  setExpandedId(expandedId === hotspot.id ? null : hotspot.id)
                }
                index={i}
              />
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
