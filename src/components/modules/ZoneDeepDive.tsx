import { useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/stores/appStore'
import { zones, type Zone } from '@/data/zones'

/* ───────── zone map layout (approximate Bangalore geography) ───────── */
const ZONE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  'zone-01': { x: 250, y: 210, w: 120, h: 100 },  // Central
  'zone-02': { x: 210, y: 340, w: 140, h: 90 },    // South
  'zone-03': { x: 400, y: 200, w: 130, h: 120 },   // East
  'zone-04': { x: 230, y: 80, w: 140, h: 100 },    // North
  'zone-05': { x: 100, y: 200, w: 120, h: 120 },   // West
  'zone-06': { x: 370, y: 350, w: 120, h: 80 },    // Southeast
  'zone-07': { x: 90, y: 340, w: 110, h: 90 },     // Southwest
  'zone-08': { x: 380, y: 70, w: 110, h: 100 },    // Northeast
}

/* ───────── helpers ───────── */
function formatCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

function trendPath(data: number[], w: number, h: number) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

const VEHICLE_COLORS: Record<string, string> = {
  cars: '#A3FF12',
  scooters: '#FBBF24',
  autos: '#FF6B35',
  trucks: '#DC2626',
  buses: '#06B6D4',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ═══════════════════════════════════════════════════ */
export default function ZoneDeepDive() {
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const setSelectedZone = useAppStore((s) => s.setSelectedZone)

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? null,
    [selectedZoneId],
  )

  return (
    <div className="relative w-full min-h-screen bg-bg-primary p-6 lg:p-10 overflow-y-auto">
      {/* ── Title ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <p className="text-text-muted text-xs tracking-[0.3em] uppercase font-mono mb-1">
          Module 08
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-platinum">
          Zone <span className="text-gradient-lime">Deep Dive</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1 max-w-lg">
          Explore Bangalore's enforcement zones — click a zone for comprehensive analytics.
        </p>
      </motion.div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* ══════════ ZONE MAP ══════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="glass-panel p-4 flex-1 min-h-[520px] relative overflow-hidden"
        >
          <svg viewBox="0 0 620 520" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* grid bg */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(163,255,18,0.04)" strokeWidth="0.5" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="620" height="520" fill="url(#grid)" />

            {zones.map((zone, i) => {
              const layout = ZONE_LAYOUT[zone.id]
              if (!layout) return null
              const isSelected = zone.id === selectedZoneId
              const hasSelection = !!selectedZoneId

              return (
                <motion.g
                  key={zone.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{
                    opacity: hasSelection && !isSelected ? 0.3 : 1,
                    scale: isSelected ? 1.05 : 1,
                  }}
                  transition={{ delay: i * 0.06, duration: 0.45 }}
                  style={{ cursor: 'pointer', transformOrigin: `${layout.x + layout.w / 2}px ${layout.y + layout.h / 2}px` }}
                  onClick={() => setSelectedZone(isSelected ? null : zone.id)}
                  whileHover={{ scale: isSelected ? 1.05 : 1.02 }}
                >
                  {/* zone rect */}
                  <rect
                    x={layout.x}
                    y={layout.y}
                    width={layout.w}
                    height={layout.h}
                    rx="8"
                    fill={zone.color + '18'}
                    stroke={isSelected ? zone.color : zone.color + '50'}
                    strokeWidth={isSelected ? 2 : 1}
                    filter={isSelected ? 'url(#glow)' : undefined}
                  />
                  {/* inner highlight */}
                  <rect
                    x={layout.x + 2}
                    y={layout.y + 2}
                    width={layout.w - 4}
                    height={layout.h - 4}
                    rx="6"
                    fill="none"
                    stroke={zone.color + '15'}
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                  {/* zone name */}
                  <text
                    x={layout.x + layout.w / 2}
                    y={layout.y + layout.h / 2 - 8}
                    textAnchor="middle"
                    fill={isSelected ? zone.color : '#E5E7EB'}
                    fontSize="13"
                    fontFamily="Outfit, sans-serif"
                    fontWeight="600"
                  >
                    {zone.name}
                  </text>
                  {/* violation count */}
                  <text
                    x={layout.x + layout.w / 2}
                    y={layout.y + layout.h / 2 + 12}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="11"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {zone.stats.totalViolations.toLocaleString()}
                  </text>
                  {/* color dot */}
                  <circle
                    cx={layout.x + 14}
                    cy={layout.y + 14}
                    r="4"
                    fill={zone.color}
                    style={{ filter: `drop-shadow(0 0 4px ${zone.color}80)` }}
                  />
                </motion.g>
              )
            })}
          </svg>
        </motion.div>

        {/* ══════════ DETAIL PANEL ══════════ */}
        <AnimatePresence mode="wait">
          {selectedZone && (
            <motion.aside
              key={selectedZone.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full xl:w-[400px] shrink-0"
            >
              <div className="glass-panel p-5 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedZone.color, boxShadow: `0 0 8px ${selectedZone.color}60` }}
                      />
                      <h2 className="font-display text-xl font-bold text-platinum">
                        {selectedZone.name} Zone
                      </h2>
                    </div>
                    <p className="text-text-secondary text-xs">{selectedZone.stationName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedZone(null)}
                    className="w-7 h-7 rounded-lg bg-bg-secondary/60 border border-border flex items-center justify-center text-text-muted hover:text-platinum hover:border-lime/30 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Total Violations"
                    value={selectedZone.stats.totalViolations.toLocaleString()}
                    color={selectedZone.color}
                    large
                  />
                  <StatCard
                    label="Active Hotspots"
                    value={String(selectedZone.stats.activeHotspots)}
                    color="#FBBF24"
                  />
                  <StatCard
                    label="Patrol Units"
                    value={String(selectedZone.stats.patrolUnits)}
                    color="#06B6D4"
                  />
                  <StatCard
                    label="Revenue"
                    value={formatCurrency(selectedZone.stats.revenue)}
                    color="#22C55E"
                  />
                </div>

                {/* Approval Rate */}
                <div className="glass-card p-4">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest mb-3">
                    Approval Rate
                  </p>
                  <div className="flex items-center gap-4">
                    <svg viewBox="0 0 80 80" className="w-16 h-16 shrink-0">
                      <circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke="rgba(163,255,18,0.1)"
                        strokeWidth="6"
                      />
                      <motion.circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke="#A3FF12"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${(selectedZone.stats.approvalRate / 100) * 201} 201`}
                        transform="rotate(-90 40 40)"
                        initial={{ strokeDasharray: '0 201' }}
                        animate={{
                          strokeDasharray: `${(selectedZone.stats.approvalRate / 100) * 201} 201`,
                        }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ filter: 'drop-shadow(0 0 4px rgba(163,255,18,0.4))' }}
                      />
                      <text
                        x="40" y="40"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#E5E7EB"
                        fontSize="15"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="700"
                      >
                        {selectedZone.stats.approvalRate}%
                      </text>
                    </svg>
                    <div>
                      <p className="text-platinum text-sm font-semibold">
                        {selectedZone.stats.approvalRate >= 85 ? 'Excellent' : selectedZone.stats.approvalRate >= 75 ? 'Good' : 'Needs Improvement'}
                      </p>
                      <p className="text-text-muted text-xs">Enforcement accuracy</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Composition */}
                <div className="glass-card p-4">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest mb-3">
                    Vehicle Composition
                  </p>
                  <div className="flex h-5 rounded-full overflow-hidden border border-border/40">
                    {Object.entries(selectedZone.vehicleComposition).map(([type, pct]) => (
                      <motion.div
                        key={type}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full"
                        style={{ backgroundColor: VEHICLE_COLORS[type] }}
                        title={`${type}: ${pct}%`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                    {Object.entries(selectedZone.vehicleComposition).map(([type, pct]) => (
                      <div key={type} className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: VEHICLE_COLORS[type] }}
                        />
                        <span className="text-text-secondary text-[10px] capitalize">{type}</span>
                        <span className="font-mono text-[10px] text-text-muted">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7-Day Trend */}
                <div className="glass-card p-4">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest mb-3">
                    7-Day Violation Trend
                  </p>
                  <svg viewBox="0 0 300 80" className="w-full h-20">
                    {/* grid lines */}
                    {[0, 20, 40, 60, 80].map((y) => (
                      <line
                        key={y}
                        x1="0" y1={y} x2="300" y2={y}
                        stroke="rgba(163,255,18,0.05)"
                        strokeWidth="0.5"
                      />
                    ))}
                    {/* area fill */}
                    <path
                      d={`${trendPath(selectedZone.trend, 300, 70)} L 300 75 L 0 75 Z`}
                      fill={`${selectedZone.color}15`}
                    />
                    {/* line */}
                    <motion.path
                      d={trendPath(selectedZone.trend, 300, 70)}
                      fill="none"
                      stroke={selectedZone.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      style={{ filter: `drop-shadow(0 0 4px ${selectedZone.color}60)` }}
                    />
                    {/* dots */}
                    {selectedZone.trend.map((v, i) => {
                      const min = Math.min(...selectedZone.trend)
                      const max = Math.max(...selectedZone.trend)
                      const range = max - min || 1
                      const x = (i / 6) * 300
                      const y = 70 - ((v - min) / range) * 70
                      return (
                        <motion.circle
                          key={i}
                          cx={x} cy={y} r="3"
                          fill={selectedZone.color}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + i * 0.06 }}
                        />
                      )
                    })}
                  </svg>
                  <div className="flex justify-between mt-1 px-0.5">
                    {DAYS.map((d) => (
                      <span key={d} className="text-[9px] text-text-muted font-mono">{d}</span>
                    ))}
                  </div>
                </div>

                {/* Deploy Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wide bg-lime text-bg-primary
                             shadow-[0_0_20px_rgba(163,255,18,0.2)] hover:shadow-[0_0_40px_rgba(163,255,18,0.35)]
                             transition-shadow"
                >
                  ⚡ Deploy Patrol Unit
                </motion.button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════ BOTTOM: Zone Comparison Bar ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-6"
      >
        <p className="text-text-muted text-[10px] uppercase tracking-[0.25em] mb-3">
          All Zones
        </p>
        <div className="flex gap-2.5 overflow-x-auto pb-2">
          {zones.map((zone, i) => {
            const isActive = zone.id === selectedZoneId
            return (
              <motion.button
                key={zone.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
                onClick={() => setSelectedZone(isActive ? null : zone.id)}
                className={`
                  shrink-0 glass-card px-4 py-3 min-w-[140px] text-left transition-all duration-300
                  ${isActive ? 'border-lime/40 shadow-[0_0_16px_rgba(163,255,18,0.12)]' : 'hover:border-lime/20'}
                `}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className={`text-xs font-semibold ${isActive ? 'text-lime' : 'text-platinum'}`}>
                    {zone.name}
                  </span>
                </div>
                <p className="font-mono text-lg font-bold text-platinum leading-tight">
                  {zone.stats.totalViolations.toLocaleString()}
                </p>
                <p className="text-text-muted text-[10px]">violations</p>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

/* ───────── Sub-component ───────── */
function StatCard({
  label,
  value,
  color,
  large,
}: {
  label: string
  value: string
  color: string
  large?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`glass-card p-3 ${large ? 'col-span-2' : ''}`}
    >
      <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">{label}</p>
      <p
        className={`font-mono font-bold ${large ? 'text-2xl' : 'text-lg'} leading-tight`}
        style={{ color }}
      >
        {value}
      </p>
    </motion.div>
  )
}
