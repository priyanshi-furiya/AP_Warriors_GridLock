import { useState, useMemo, useCallback } from 'react'
import { motion } from 'motion/react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
} from 'recharts'
import { useDataStore } from '@/stores/dataStore'

/* ── Types ── */
interface HourlyEntry {
  hour: number
  count: number
  percentage: number
  approvalRate: number
  highRisk: number
}

interface DayEntry {
  day: string
  shortDay: string
  count: number
  percentage: number
  approvalRate: number
  isWeekend: boolean
}

interface MonthEntry {
  year: number
  month: number
  label: string
  count: number
  highRisk: number
  weekendCount: number
}

interface TemporalPayload {
  hourly: HourlyEntry[]
  heatmap: Record<string, number[]>
  days: DayEntry[]
  months: MonthEntry[]
}


const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}
const HOURS = Array.from({ length: 24 }, (_, i) => i)

/* ── Color helpers ── */
function heatColor(value: number, max: number): string {
  if (max === 0) return '#0D0D14'
  const ratio = value / max
  if (ratio < 0.15) return '#0D0D14'
  if (ratio < 0.3) return 'rgba(34, 197, 94, 0.3)'
  if (ratio < 0.45) return 'rgba(34, 197, 94, 0.6)'
  if (ratio < 0.6) return 'rgba(251, 191, 36, 0.5)'
  if (ratio < 0.75) return 'rgba(251, 191, 36, 0.8)'
  if (ratio < 0.9) return 'rgba(220, 38, 38, 0.6)'
  return 'rgba(220, 38, 38, 0.9)'
}

function isNightHour(h: number): boolean {
  return h >= 21 || h <= 6
}

/* ── Custom Tooltip for Recharts ── */
function GlassTooltip({ active, payload, label, suffix }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string | number
  suffix?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-4 py-3 border border-border-bright shadow-xl">
      <p className="font-mono text-xs text-platinum mb-1.5">{label}{suffix || ''}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-xs text-text-secondary">{p.name}:</span>
          <span className="font-mono text-xs font-semibold text-platinum">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Heatmap Cell Tooltip ── */
function CellTooltip({ day, hour, count, x, y }: {
  day: string; hour: number; count: number; x: number; y: number
}) {
  return (
    <motion.div
      className="fixed z-50 glass-card px-3 py-2 pointer-events-none border border-border-bright shadow-xl"
      style={{ left: x + 14, top: y - 40 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <p className="font-mono text-xs text-platinum font-bold">{count.toLocaleString()}</p>
      <p className="text-[10px] text-text-muted">{day} · {String(hour).padStart(2, '0')}:00</p>
    </motion.div>
  )
}

export default function TemporalAnalytics() {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; x: number; y: number } | null>(null)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [selectedCol, setSelectedCol] = useState<number | null>(null)
  
  const hourlyStore = useDataStore(s => s.hourly)
  const daysStore = useDataStore(s => s.days)
  const monthsStore = useDataStore(s => s.monthly)
  const summaryData = useDataStore(s => s.summary)

  const hourly = hourlyStore.hourly as HourlyEntry[]
  const heatmap = hourlyStore.heatmap as Record<string, number[]>
  const days = daysStore as DayEntry[]
  const months = monthsStore as MonthEntry[]
  const coverageLabel = `${summaryData.dateRange.min} to ${summaryData.dateRange.max}`

  /* ── Derived data ── */
  const heatmapMax = useMemo(() => {
    let max = 0
    DAY_ORDER.forEach(d => {
      const row = heatmap[d]
      if (row) row.forEach(v => { if (v > max) max = v })
    })
    return max
  }, [heatmap])

  const peakHour = useMemo(() => hourly.reduce((p, c) => c.count > p.count ? c : p, hourly[0]), [hourly])
  const nightCount = useMemo(() => hourly.filter(h => isNightHour(h.hour)).reduce((s, h) => s + h.count, 0), [hourly])
  const totalCount = useMemo(() => hourly.reduce((s, h) => s + h.count, 0), [hourly])
  const nightPct = ((nightCount / totalCount) * 100).toFixed(1)

  const sundayData = days.find(d => d.day === 'Sunday')
  const mondayData = days.find(d => d.day === 'Monday')
  const sundayVsMonday = sundayData && mondayData
    ? (((sundayData.count - mondayData.count) / mondayData.count) * 100).toFixed(1)
    : '0'

  const peakMonth = useMemo(() => months.reduce((p, c) => c.count > p.count ? c : p, months[0]), [months])

  const handleCellClick = useCallback((day: string, hour: number) => {
    setSelectedRow(prev => prev === day ? null : day)
    setSelectedCol(prev => prev === hour ? null : hour)
  }, [])

  const handleCellHover = useCallback((day: string, hour: number, e: React.MouseEvent) => {
    setHoveredCell({ day, hour, x: e.clientX, y: e.clientY })
  }, [])

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null)
  }, [])

  /* ── Hourly chart data ── */
  const hourlyChartData = useMemo(() => hourly.map(h => ({
    hour: String(h.hour).padStart(2, '0'),
    count: h.count,
    approvalRate: h.approvalRate,
  })), [hourly])

  /* ── Day chart data ── */
  const dayChartData = useMemo(() => days.map(d => ({
    name: d.shortDay,
    count: d.count,
    approvalRate: d.approvalRate,
    isWeekend: d.isWeekend,
  })), [days])

  /* ── Month chart data ── */
  const monthChartData = useMemo(() => months.map(m => ({
    label: m.label,
    count: m.count,
    highRisk: m.highRisk,
  })), [months])

  /* ── Insight cards ── */
  const insights = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
        </svg>
      ),
      title: 'Night Enforcement',
      value: `${nightPct}%`,
      desc: 'of violations between 9PM–6AM',
      color: '#FBBF24',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-orange">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
      title: 'Sunday Peak',
      value: `+${sundayVsMonday}%`,
      desc: 'more violations than Monday',
      color: '#FF6B35',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lime">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: 'Peak Hour',
      value: `${String(peakHour.hour).padStart(2, '0')}:00`,
      desc: `highest count — ${peakHour.count.toLocaleString()} violations`,
      color: '#A3FF12',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red">
          <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 5-9" />
        </svg>
      ),
      title: peakMonth.label + ' Peak',
      value: peakMonth.count.toLocaleString(),
      desc: 'highest enforcement month',
      color: '#DC2626',
    },
  ]

  return (
    <div className="w-full flex flex-col gap-6 p-6">
      {/* ── Module Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-muted">
          Analytics
        </span>
        <h1 className="font-display text-3xl font-bold mt-1 text-gradient-lime">
          Temporal Analysis
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Time-based pattern analysis across{' '}
          <span className="font-mono text-platinum font-semibold">{summaryData.totalViolations.toLocaleString('en-IN')}</span> violations
        </p>
      </motion.div>

      {/* ── Section 1: Heatmap ── */}
      <motion.div
        className="glass-panel p-6 hud-corner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-platinum">
              7-Day × 24-Hour Violation Density
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Click any cell to highlight row &amp; column · Night hours (21:00–06:00) subtly marked
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Low', color: 'rgba(34,197,94,0.3)' },
              { label: 'Mid', color: 'rgba(251,191,36,0.5)' },
              { label: 'High', color: 'rgba(220,38,38,0.6)' },
              { label: 'Peak', color: 'rgba(220,38,38,0.9)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-text-muted">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hour labels (top) */}
        <div className="flex ml-[60px] mb-1.5">
          {HOURS.map(h => (
            <div
              key={h}
              className={`flex-1 text-center font-mono text-[9px] transition-colors duration-150 ${
                selectedCol === h ? 'text-lime font-bold' : 'text-text-muted'
              }`}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex flex-col gap-[3px]">
          {DAY_ORDER.map((day, rowIdx) => {
            const row = heatmap[day] || Array(24).fill(0)
            const isWeekend = day === 'Saturday' || day === 'Sunday'
            const isRowSelected = selectedRow === day

            return (
              <div key={day} className="flex items-center gap-0">
                {/* Row label */}
                <div className={`w-[60px] shrink-0 text-right pr-3 font-mono text-xs transition-colors duration-150 ${
                  isRowSelected ? 'text-lime font-bold' : isWeekend ? 'text-amber/70' : 'text-text-secondary'
                }`}>
                  {DAY_SHORT[day]}
                </div>

                {/* Cells */}
                <div className="flex-1 flex gap-[2px]">
                  {row.map((count, colIdx) => {
                    const isNight = isNightHour(colIdx)
                    const isHighlighted = isRowSelected || selectedCol === colIdx
                    const cellColor = heatColor(count, heatmapMax)

                    return (
                      <motion.div
                        key={colIdx}
                        className={`flex-1 h-7 rounded-[2px] cursor-pointer transition-all duration-150 relative ${
                          isHighlighted ? 'ring-1 ring-lime/30' : ''
                        }`}
                        style={{
                          backgroundColor: cellColor,
                          boxShadow: isNight ? 'inset 0 0 0 1px rgba(251,191,36,0.06)' : 'none',
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.3,
                          delay: rowIdx * 0.03 + colIdx * 0.012,
                          ease: 'easeOut',
                        }}
                        onClick={() => handleCellClick(day, colIdx)}
                        onMouseEnter={(e) => handleCellHover(day, colIdx, e)}
                        onMouseMove={(e) => handleCellHover(day, colIdx, e)}
                        onMouseLeave={handleCellLeave}
                        whileHover={{ scale: 1.25, zIndex: 10 }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Night zone annotation */}
        <div className="flex ml-[60px] mt-2">
          <div className="flex-1 flex">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center">
                {isNightHour(h) && (
                  <div className="h-0.5 mx-0.5 rounded-full bg-amber/20" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex ml-[60px] mt-0.5">
          <div className="text-[9px] text-amber/40 font-mono">← Night Zone</div>
          <div className="flex-1" />
          <div className="text-[9px] text-amber/40 font-mono">Night Zone →</div>
        </div>
      </motion.div>

      {/* Heatmap tooltip (portal-like) */}
      {hoveredCell && (
        <CellTooltip
          day={hoveredCell.day}
          hour={hoveredCell.hour}
          count={(heatmap[hoveredCell.day] || [])[hoveredCell.hour] || 0}
          x={hoveredCell.x}
          y={hoveredCell.y}
        />
      )}

      {/* ── Section 2: Two-panel row ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Hourly Profile */}
        <motion.div
          className="glass-panel p-6 hud-corner"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="font-display text-base font-semibold text-platinum mb-1">
            Hourly Violation Profile
          </h2>
          <p className="text-xs text-text-muted mb-4">
            24-hour distribution · Night hours highlighted
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A3FF12" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#A3FF12" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                {/* Night zone background */}
                <ReferenceArea x1="00" x2="06" fill="rgba(251,191,36,0.04)" />
                <ReferenceArea x1="21" x2="23" fill="rgba(251,191,36,0.04)" />
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(163,255,18,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  stroke="#6B7280"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#6B7280' }}
                  axisLine={{ stroke: 'rgba(163,255,18,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <GlassTooltip
                      active={active}
                      payload={payload?.map(p => ({
                        value: p.value as number,
                        name: 'Violations',
                        color: '#A3FF12',
                      }))}
                      label={`${label}:00`}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#A3FF12"
                  strokeWidth={2}
                  fill="url(#limeGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#A3FF12', stroke: '#07070B', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right: Day-of-Week */}
        <motion.div
          className="glass-panel p-6 hud-corner"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="font-display text-base font-semibold text-platinum mb-1">
            Day-of-Week Distribution
          </h2>
          <p className="text-xs text-text-muted mb-4">
            <span className="text-lime">■</span> Weekday &nbsp;
            <span className="text-amber">■</span> Weekend &nbsp;
            <span className="text-orange">—</span> Avg Violations
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(163,255,18,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#9CA3AF' }}
                  axisLine={{ stroke: 'rgba(163,255,18,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <GlassTooltip
                      active={active}
                      payload={payload?.map(p => ({
                        value: p.value as number,
                        name: p.dataKey === 'count' ? 'Violations' : 'Approval',
                        color: p.dataKey === 'count' ? '#A3FF12' : '#FF6B35',
                      }))}
                      label={label}
                    />
                  )}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {dayChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.isWeekend ? '#FBBF24' : '#A3FF12'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>

                {/* Average approval rate line */}
                <ReferenceLine
                  y={days.reduce((s, d) => s + d.count, 0) / days.length}
                  stroke="#FF6B35"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Avg Violations',
                    position: 'right',
                    fill: '#FF6B35',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Section 3: Monthly Trend ── */}
      <motion.div
        className="glass-panel p-6 hud-corner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-platinum">
              Monthly Enforcement Trend
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {coverageLabel} · Peak month annotated
            </p>
          </div>
          <div className="flex items-center gap-2 glass-card px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-lime animate-pulse-glow" />
            <span className="font-mono text-xs text-lime">
              Peak: {peakMonth.label}
            </span>
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthChartData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="monthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A3FF12" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(163,255,18,0.08)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="#6B7280"
                tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#9CA3AF' }}
                axisLine={{ stroke: 'rgba(163,255,18,0.08)' }}
                tickLine={false}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <GlassTooltip
                    active={active}
                    payload={payload?.map(p => ({
                      value: p.value as number,
                      name: p.dataKey === 'count' ? 'Total Violations' : 'High Risk',
                      color: p.dataKey === 'count' ? '#A3FF12' : '#DC2626',
                    }))}
                    label={label}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#A3FF12"
                strokeWidth={2.5}
                fill="url(#monthGradient)"
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  const isPeak = payload.label === peakMonth.label
                  return (
                    <g key={payload.label}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isPeak ? 6 : 4}
                        fill={isPeak ? '#A3FF12' : '#07070B'}
                        stroke="#A3FF12"
                        strokeWidth={isPeak ? 2.5 : 1.5}
                      />
                      {isPeak && (
                        <>
                          <circle cx={cx} cy={cy} r={12} fill="none" stroke="#A3FF12" strokeWidth={1} opacity={0.3} />
                          <text
                            x={cx}
                            y={cy - 18}
                            textAnchor="middle"
                            fill="#A3FF12"
                            fontSize={11}
                            fontFamily="JetBrains Mono"
                            fontWeight="bold"
                          >
                            {peakMonth.count.toLocaleString()}
                          </text>
                        </>
                      )}
                    </g>
                  )
                }}
                activeDot={{ r: 5, fill: '#A3FF12', stroke: '#07070B', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="highRisk"
                stroke="#DC2626"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                dot={{ r: 3, fill: '#07070B', stroke: '#DC2626', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-lime rounded" />
            <span className="text-[10px] text-text-muted">Total Violations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-red rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #DC2626 0px, #DC2626 4px, transparent 4px, transparent 7px)' }} />
            <span className="text-[10px] text-text-muted">High Risk</span>
          </div>
        </div>
      </motion.div>

      {/* ── Section 4: Insight Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.title}
            className="glass-card p-5 hud-corner flex flex-col gap-3 group hover:border-lime/20 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${insight.color}15` }}
              >
                {insight.icon}
              </div>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ backgroundColor: insight.color }} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-mono">
                {insight.title}
              </span>
              <div className="font-mono text-2xl font-bold mt-0.5" style={{ color: insight.color }}>
                {insight.value}
              </div>
              <p className="text-xs text-text-secondary mt-1">{insight.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
